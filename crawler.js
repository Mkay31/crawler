const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const fs = require('fs').promises;
const path = require('path');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());



const LinkClassifier = require('./link-classifier');

const classifier = new LinkClassifier();


class EcommerceCrawler {
    constructor(domains, options = {}) {
        this.domains = domains;
        this.urlsToVisit = new Map();
        this.visitedUrls = new Map();
        this.productData = new Map();
        this.allToBeVisitedUrls = new Map();
        this.options = {
            maxPagesPerDomain: options.maxPagesPerDomain || 20,
            concurrentRequests: options.concurrentRequests || 5,
            outputDir: options.outputDir || './crawler-output',
            maxConcurrentRequests: options.maxConcurrentRequestsPages || 5
        };
    }

    async initialize() {
        for (const domain of this.domains) {
            const baseUrl = `https://${domain}`;
            this.urlsToVisit.set(domain, [baseUrl]);
            this.visitedUrls.set(domain, new Set());
            this.productData.set(domain, new Set());
            this.allToBeVisitedUrls.set(domain, new Set());
            this.allToBeVisitedUrls.get(domain).add(baseUrl);
        }

        await fs.mkdir(this.options.outputDir, { recursive: true });
    }



    async crawlPage(url, domain) {
        try {
         
            const browser = await puppeteer.launch({ headless: false });
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            await page.waitForSelector('body');
            await this.autoScroll(page);

            const content = await page.content();
            const $ = cheerio.load(content);
            const links = new Set();

            $('a[href]').each((_, element) => {
                const href = $(element).attr('href');
                const normalizedUrl = classifier.normalizeUrl(href, domain);

                console.log("normalizedUrl",normalizedUrl);
                if (normalizedUrl && normalizedUrl.includes(domain)) {
                    if (classifier.isProductUrl(normalizedUrl)) {
                        this.productData.get(domain).add(normalizedUrl);
                    } else if (classifier.isProductListingUrl(normalizedUrl)) {
                        links.add(normalizedUrl);
                    }
                }
            });

            let nextButtonSelector = 'a.next, button.next, .next, .pagination-next , a.next-page'; 
            let nextButtonExists = await page.$(nextButtonSelector); 

            while (nextButtonExists) {
                console.log(`Found 'Next' button, clicking to the next page...`);

                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
                    page.click(nextButtonSelector)
                ]);

                let currentUrl = page.url();
                currentUrl = classifier.normalizeUrl(currentUrl);
                this.visitedUrls.get(domain).add(currentUrl);

                
                
                await this.autoScroll(page);
                const newContent = await page.content();
                const newLinks = cheerio.load(newContent);

                newLinks('a[href]').each((_, element) => {
                    const href = newLinks(element).attr('href');
                    const normalizedUrl = classifier.normalizeUrl(href, domain);

                    if (normalizedUrl && normalizedUrl.includes(domain)) {
                        if (classifier.isProductUrl(normalizedUrl)) {
                            this.productData.get(domain).add(normalizedUrl);
                        } else if (classifier.isProductListingUrl(normalizedUrl)) {
                            links.add(normalizedUrl);
                        }
                    }
                });

                nextButtonExists = await page.$(nextButtonSelector);
            }

            await browser.close();
            return Array.from(links);
        } catch (error) {
            console.error(`Error crawling ${url}: ${error.message}`);
            return [];
        }
    }

    async autoScroll(page) {

        let maxSrollHeight = 10000;
        try {
            await page.evaluate(async () => {

                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;

                        if (totalHeight >= scrollHeight || totalHeight >= maxSrollHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });
        } catch (error) {
            console.error(`Error scrolling: ${error.message}`);
        }
    }


    async crawlDomain(domain) {
        const urlsToVisit = this.urlsToVisit.get(domain);
        const visitedUrls = this.visitedUrls.get(domain);
        const maxConcurrentRequests = this.options.maxConcurrentRequests;

        const processBatch = async (batch) => {
            const promises = batch.map(async (currentUrl) => {
                console.log(`Crawling ${currentUrl} (${visitedUrls.size + 1}/${this.options.maxPagesPerDomain})`);
                visitedUrls.add(currentUrl);

                let newUrls = [];
                let retries = 3;

                while (retries > 0) {
                    try {
                        newUrls = await this.crawlPage(currentUrl, domain);
                        break;
                    } catch (error) {
                        retries--;
                        console.warn(`Retrying ${currentUrl} (${retries} retries left)`);
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 1000)); // Exponential backoff
                    }
                }

                for (const url of newUrls) {
                    const normalizedUrl = classifier.normalizeUrl(url, domain);
                    if (normalizedUrl && !visitedUrls.has(normalizedUrl) && !this.allToBeVisitedUrls.get(domain).has(url)) {
                        urlsToVisit.push(normalizedUrl); // Add new URL to visit list
                        this.allToBeVisitedUrls.get(domain).add(url);
                    }
                }
            });

            await Promise.all(promises);
        };

        while (urlsToVisit.length > 0 && visitedUrls.size < this.options.maxPagesPerDomain) {


            let batchSize = 0;

            let batchArray = [];

            while (urlsToVisit.length > 0 && visitedUrls.size < this.options.maxPagesPerDomain && batchSize < maxConcurrentRequests) {
                let currentUrl = urlsToVisit.shift();
                currentUrl = classifier.normalizeUrl(currentUrl);
                if (visitedUrls.has(currentUrl) || visitedUrls.has(currentUrl+'/')) continue;
                batchArray.push(currentUrl);
                batchSize++;
            }

            await processBatch(batchArray);

            await new Promise(resolve => setTimeout(resolve, 500));
        }


        console.log(`Finished crawling ${domain}`);
        console.log(`Visited ${visitedUrls.size} pages`, visitedUrls);
        console.log(`Visited ${visitedUrls.size} pages`, this.allToBeVisitedUrls.get(domain));
    }


    async crawl() {
        await this.initialize();
        const batchSize = this.options.concurrentRequests;
        for (let i = 0; i < this.domains.length; i += batchSize) {
            const batch = this.domains.slice(i, i + batchSize);
            await Promise.all(batch.map(domain => this.crawlDomain(domain)));
        }
    }


    async saveResults() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const results = {};
        for (const [domain, urls] of this.productData) {
            results[domain] = {
                productUrls: Array.from(urls),
                totalProducts: urls.size,
                pagesVisited: this.visitedUrls.get(domain).size,
                visitedUrls: this.visitedUrls.get(domain)
            };
        }

        const outputPath = path.join(this.options.outputDir, `results-${timestamp}.json`);
        await fs.writeFile(outputPath, JSON.stringify(results, null, 2));

        const summary = {
            timestamp,
            totalDomains: this.domains.length,
            domains: Object.entries(results).map(([domain, data]) => ({
                domain,
                productCount: data.totalProducts,
                pagesVisited: data.pagesVisited
            }))
        };

        const summaryPath = path.join(this.options.outputDir, `summary-${timestamp}.json`);
        await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

        console.log(`Results saved to ${outputPath}`);
        console.log(`Summary saved to ${summaryPath}`);
    }

    async run() {
        console.log(`Starting crawl for ${this.domains.length} domains`);
        const startTime = Date.now();

        try {
            await this.crawl();
            await this.saveResults();

            const duration = (Date.now() - startTime) / 1000;
            console.log(`Crawl completed in ${duration} seconds`);
        } catch (error) {
            console.error('Crawl failed:', error);
            throw error;
        }
    }
}

const domains = [
    //'celio.in',
    // 'www.snapdeal.com',
    //'www.myntra.com',
    // 'www.flipkart.com',
    'www.scrapingcourse.com',
    // 'newmarketkart.com'
    //'www.amazon.in'
];

const crawler = new EcommerceCrawler(domains, {
    maxPagesPerDomain: 100,
    concurrentRequests: 5,
    outputDir: './crawler-results',
    maxConcurrentRequestsPages: 1
});

crawler.run()
    .then(() => console.log('Process completed'))
    .catch(error => console.error('Process failed:', error))
    .finally(() => process.exit());