class LinkClassifier {


    excludePatterns = [
        'reviews', '/edit', '/login', '/register', '/account', '/cart',
        '/checkout', '/wishlist', '/profile', '/about', '/contact', '/help',
        '/faq', '/support', '/terms', '/privacy', '/blog', '/news', '/careers',
        '/shipping', '/returns', '/orders', '/signin', '/order-history',
        '/subscription', '/subscriptions', '/user', '/dashboard', '/portal/',
        '/help', '/business', '/country', '/history', '/dashboard', '/now'
    ];

    productIndicators = [
        '/product/', 'p=', 'pid=', '/pd/', '-pd-', '/item/', 'sku=',
        'product_id=', '/buy/', '/description/', '/productdetail/', '/productinfo/',
        '/productview/', '/productshow/', '/productname/', '/productdescription/',
        '/p-', '/i-', '/v-', '/d-', '/id-', '/dp/', '/shopnow/', '/details/', '/buy-now', '/add-to-cart',
        '/sku-', '/model-', '/variant-', '/details-', '/config-', '/buyitnow', '/quickview/', '/buy'
    ];

    nonProductIndicators = [
        'reviews', '/category/', '/categories/', '/collections/', '/search/', '/list/',
        'sort=', 'filter=', 'page=', 'ref=', 'type=', 'brand=', 'browse=', '/tag/', '/topic/',
        'viewall=', 'dir=', '/store/', '/shop/', '/explore/', '/offers/', '/best/', '/deals/', '/featured/', '/promo/', '/hot/', '/new/', '/sale/', '/help/', '/business', '/country', '/history/',
    ];

    isProductListingUrl(url) {

        const normalizedUrl = url.toLowerCase().split('?')[0].split('#')[0];
        if (this.excludePatterns.some(pattern => normalizedUrl.includes(pattern))) {
            return false;
        }
        return true;
    }

    isProductUrl(url) {
        const normalizedUrl = url.toLowerCase().split('?')[0].split('#')[0];

        if (this.nonProductIndicators.some(pattern => normalizedUrl.includes(pattern))) {
            return false;
        }

        return this.productIndicators.some(pattern => normalizedUrl.includes(pattern));
    }

    normalizeUrl(url, domain) {
        try {
            if (!url.startsWith('http')) {
                if (url.startsWith('//')) {
                    url = `https:${url}`; // For protocol-relative URLs (e.g., //example.com)
                } else if (url.startsWith('/')) {
                    url = `https://${domain}${url}`; // For relative paths (e.g., /path/to/page)
                } else {
                    url = `https://${domain}/${url}`; // For relative URLs without slashes (e.g., page.html)
                }
            }
    
            // Create a URL object to manipulate the URL
            const normalizedUrl = new URL(url);
    
            normalizedUrl.search = '';  // Remove query parameters
            normalizedUrl.hash = '';    // Remove fragments
    
            // Remove trailing slash if not the root path (
            if (normalizedUrl.pathname !== '/' && normalizedUrl.pathname.endsWith('/')) {
                normalizedUrl.pathname = normalizedUrl.pathname.replace(/\/$/, ''); // Remove trailing slash
            }
    
            // Return the normalized URL as a string
            return normalizedUrl.href;
        } catch (error) {
            console.warn(`Invalid URL: ${url}`);
            return null;
        }
    }
    
}



module.exports = LinkClassifier;
