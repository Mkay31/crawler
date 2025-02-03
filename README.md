# **Web Crawler for E-Commerce Product URLs**

## **Introduction**
This project implements a scalable and robust web crawler to extract product URLs from multiple e-commerce websites. The crawler is designed to handle dynamically loaded content, pagination, and concurrency while maintaining efficiency and avoiding detection.

## **Technologies Used**
- **Node.js** - Runtime environment
- **Puppeteer & puppeteer-extra** - Headless browser automation
- **Cheerio** - HTML parsing and manipulation
- **Stealth Plugin** - Avoids bot detection
- **Concurrency Handling** - Efficient crawling with multiple requests in parallel

## **Setup & Installation**

### **Prerequisites**
Ensure you have **Node.js** installed on your system.

### **Installation Steps**
1. Clone the repository:
   ```sh
   git clone <repository_url>
   cd <repository_folder>
   ```
2. Install dependencies:
   ```sh
   npm install
   ```

### **Running the Crawler**
Run the crawler using:
```sh
node crawler.js
```

## **Design and Implementation**

### **1. Crawler Initialization**
- The crawler is initialized with configurable parameters:
  - `startUrls` - List of e-commerce site URLs to crawl
  - `maxDepth` - Maximum depth of link traversal
  - `maxConcurrentRequests` - Number of pages processed concurrently
  - `productUrlPattern` - Regex pattern to identify product URLs
- Puppeteer launches a **headless browser** instance to navigate websites.

### **2. Page Crawling Process**
- The crawler fetches a URL and processes its contents using Puppeteer.
- If the page contains dynamically loaded content, it **auto-scrolls** until all elements are visible.
- Extracted URLs are **classified** based on predefined patterns to differentiate between product pages, category pages, and non-relevant links.
- Pagination is handled by identifying and clicking on the **Next** button dynamically.

### **3. Auto-Scrolling for Dynamic Content**
- The function scrolls the page **in increments** until:
  - The bottom of the page is reached
  - A maximum scroll height is exceeded (to prevent infinite scrolling)

### **4. Link Extraction and Classification**
- Cheerio is used to parse the page and extract **all anchor tags (`<a>` elements)**.
- Each extracted URL is checked against the `productUrlPattern`.
- Only unique and **valid product URLs** are stored.

### **5. Handling Pagination**
- The crawler detects **“Next”** buttons and clicks them to navigate to the next set of products.
- Uses a combination of `waitForNavigation` and a timeout to prevent getting stuck if the button doesn’t trigger a navigation event.

### **6. Concurrency and Performance Optimization**
- The crawler maintains a **queue of URLs** to process, ensuring that multiple pages are crawled in parallel.
- Implements a **visited URLs set** to avoid duplicate processing.
- Uses a **single browser instance** with multiple pages instead of launching a new browser for every request.

### **7. Error Handling & Resilience**
- Retries failed requests up to a certain limit before skipping.
- Detects **CAPTCHA pages** and logs them for manual review.
- Implements a timeout mechanism to prevent hanging on unresponsive pages.


## **Conclusion**
This approach ensures an efficient, scalable, and resilient web crawling system tailored for e-commerce platforms. The use of Puppeteer, Cheerio, and concurrency mechanisms allows seamless extraction of product URLs while mitigating potential challenges like dynamic content loading and anti-bot detection.

