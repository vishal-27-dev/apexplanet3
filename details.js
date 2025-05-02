document.addEventListener('DOMContentLoaded', () => {

    // --- Constants & Setup ---
    const detailsLoading = document.getElementById('details-loading');
    const detailsError = document.getElementById('details-error');
    const detailsContent = document.getElementById('details-content');

    // Elements to populate
    const titleElement = document.getElementById('details-title');
    const pageTitle = document.querySelector('title');
    const posterImg = document.getElementById('details-poster-img');
    const plotElement = document.getElementById('details-plot');
    const yearElement = document.getElementById('details-year');
    const genreElement = document.getElementById('details-genre');
    const castElement = document.getElementById('details-cast');
    const ratingElement = document.getElementById('details-rating');
    const imdbLink = document.getElementById('imdb-link');
    const imdbLinkReviews = document.getElementById('imdb-link-reviews');
    const streamingPlaceholder = document.getElementById('streaming-placeholder');
    const commentsSection = document.getElementById('comments-section');

    // API credentials (must match script.js)
    const RAPIDAPI_KEY = '30abe74114mshb8417c845d44756p15e916jsnbf3a6a245f97'; // Your key
    const RAPIDAPI_HOST = 'imdb236.p.rapidapi.com';     // Correct Host

    // !!! CRITICAL ASSUMPTION !!!
    // You MUST find the correct endpoint URL in the imdb236 docs for getting details BY IMDb ID (e.g., tt6473300)
    // Replace the URL below with the ACTUAL endpoint. This is just a GUESS.
    const DETAIL_API_URL_BASE = `https://imdb236.p.rapidapi.com/get_detail?id=`; // <--- VERIFY & REPLACE THIS URL BASE
    // Or maybe it's like: `https://imdb236.p.rapidapi.com/title_detail?imdb_id=`
    // Check the API documentation!

     const apiOptions = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        }
    };

    // --- Fetch & Display Logic ---

    async function fetchAndDisplayDetails() {
        if (commentsSection) commentsSection.style.display = 'none'; // Hide comments initially
        showLoading();
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const movieId = urlParams.get('id');

            if (!movieId || !movieId.startsWith('tt')) { // Basic validation for IMDb ID format
                throw new Error("Valid Movie ID (tt...) not found in URL.");
            }
            if (!RAPIDAPI_KEY || RAPIDAPI_KEY.length < 20 || RAPIDAPI_KEY.includes('YOUR')) {
                 throw new Error("RapidAPI Key is missing or seems invalid in details.js");
             }
             if (!DETAIL_API_URL_BASE || DETAIL_API_URL_BASE.includes('YOUR_ACTUAL_ENDPOINT')) {
                 throw new Error("Detail API endpoint URL is not correctly set in details.js. Please verify and replace the placeholder/guess.");
             }

            // Construct the *assumed* Detail API URL
            const detailUrl = `${DETAIL_API_URL_BASE}${movieId}`;

            const response = await fetch(detailUrl, apiOptions);
            if (!response.ok) {
                const errorText = await response.text();
                 console.error(`API Error (${response.status}) for ID "${movieId}": ${errorText}`);
                 throw new Error(`API request failed for "${movieId}" (Status: ${response.status}). Check the detail endpoint URL and ID validity.`);
            }
            const data = await response.json();

            // --- !!! DATA PARSING ASSUMPTION !!! ---
            // The structure of 'data' depends ENTIRELY on the response from your **DETAIL** endpoint.
            // Adapt all 'data.propertyName' access below based on the ACTUAL detail response structure.
            // I'm using names similar to the search response as a starting point - this is likely INACCURATE for the detail endpoint.

            if (!data /* || !data.some_key_that_must_exist_in_detail */) {
                 throw new Error("Received invalid or empty data structure from the detail API.");
             }

            const movieDetails = data; // Assuming the root object contains the details

            // Populate common elements (ADAPT PROPERTY NAMES)
            const movieTitle = movieDetails.primaryTitle || movieDetails.title || 'Details';
            titleElement.textContent = movieTitle;
            pageTitle.textContent = `${movieTitle} - Vis Recommendations`;

            const posterSrc = movieDetails.primaryImage || movieDetails.image || 'assets/placeholder-poster.png';
            posterImg.src = posterSrc;
            posterImg.alt = `${movieTitle} Poster`;
             posterImg.onerror=() => { posterImg.src='assets/placeholder-poster.png'; }; // Set placeholder on error

            // Plot might be named differently, check response
             plotElement.textContent = movieDetails.plot || movieDetails.description || 'Plot information not available.';

            // Basic details (ADAPT PROPERTY NAMES)
            yearElement.textContent = movieDetails.startYear || movieDetails.year || 'N/A';
            genreElement.textContent = movieDetails.genres ? movieDetails.genres.join(', ') : 'N/A';
            ratingElement.textContent = movieDetails.averageRating ? `⭐ ${movieDetails.averageRating}` : 'N/A';

             // Cast (Assuming structure - ADAPT if needed)
            let castText = 'N/A';
            if (movieDetails.actors && Array.isArray(movieDetails.actors)) { // Example structure: actors array
                castText = movieDetails.actors.slice(0, 6).map(actor => actor.name || 'Unknown').join(', ') + (movieDetails.actors.length > 6 ? '...' : '');
             } else if (movieDetails.cast && Array.isArray(movieDetails.cast)) { // Alternative structure: cast array
                  castText = movieDetails.cast.slice(0, 6).map(actor => actor.name || 'Unknown').join(', ') + (movieDetails.cast.length > 6 ? '...' : '');
             }
             castElement.textContent = castText;

            // Set IMDb links (These are static based on ID, should work)
            const imdbUrl = `https://www.imdb.com/title/${movieId}/`;
            if(imdbLink) imdbLink.href = imdbUrl;
            if(imdbLink) imdbLink.style.display = 'inline';
            if(imdbLinkReviews) imdbLinkReviews.href = `${imdbUrl}reviews`;
            if(imdbLinkReviews) imdbLinkReviews.style.display = 'inline';

            // Populate Streaming Info (Highly API dependent - Keep as placeholder for now)
            populateStreamingInfo(movieDetails.externalLinks); // Pass whatever provider data might exist (likely limited)

            // Initialize Disqus ONLY after successfully loading data
            initializeDisqus(movieId, window.location.href);
             if (commentsSection) commentsSection.style.display = 'block'; // Show comments section

            hideLoading();

        } catch (error) {
            console.error("Error fetching or displaying details:", error);
            showError(error.message || "An error occurred loading details. Please check the URL and API status.");
        }
    }

     function populateStreamingInfo(externalLinks) {
        if (!streamingPlaceholder) return;
        streamingPlaceholder.innerHTML = ''; // Clear default
        let foundLink = false;
         if (externalLinks && Array.isArray(externalLinks) && externalLinks.length > 0) {
            streamingPlaceholder.innerHTML = '<h5>Check Availability:</h5>'; // Add heading
             externalLinks.forEach(link => {
                if (typeof link === 'string' && link.startsWith('http')) {
                    // Basic attempt to guess provider from URL - very crude!
                     let providerName = 'Official Site';
                    try { providerName = new URL(link).hostname.replace('www.', ''); } catch(e){}

                     const linkElement = document.createElement('a');
                     linkElement.href = link;
                     linkElement.textContent = providerName;
                     linkElement.target = '_blank';
                     linkElement.rel = 'noopener noreferrer nofollow';
                     streamingPlaceholder.appendChild(linkElement);
                     streamingPlaceholder.appendChild(document.createTextNode(' | ')); // Separator
                    foundLink = true;
                }
            });
             // Remove trailing separator if links were added
             if(foundLink && streamingPlaceholder.lastChild && streamingPlaceholder.lastChild.nodeType === Node.TEXT_NODE) {
                 streamingPlaceholder.removeChild(streamingPlaceholder.lastChild);
             }
         }

        if (!foundLink) {
            streamingPlaceholder.innerHTML = '<p>Specific streaming links unavailable via this API. Check popular platforms.</p>';
        }
     }


     function initializeDisqus(pageIdentifier, pageUrl) {
         // Make sure your Disqus shortname is correctly set in details.html embed code
         // Example: s.src = '//YOUR_SHORTNAME.disqus.com/embed.js';

         window.disqus_config = function () {
            this.page.url = pageUrl;
            this.page.identifier = pageIdentifier; // Unique ID for the comment thread
         };

        // Check if Disqus is already loaded (e.g., for SPAs, though not strictly needed for Jekyll)
        // This reset helps if navigating between detail pages dynamically (if you implement that later)
        if (window.DISQUS) {
            DISQUS.reset({
                reload: true,
                config: window.disqus_config // Pass the function directly
            });
        } else {
            // If not loaded, the embed script in details.html will pick up window.disqus_config
            console.log("Disqus config set. Embed script should load it.");
        }
     }


    function showLoading() {
        if(detailsLoading) detailsLoading.classList.add('active');
        if(detailsError) detailsError.style.display = 'none';
        const mainFlex = document.querySelector('.details-main-flex');
         if (mainFlex) mainFlex.style.visibility = 'hidden'; // Hide content gently
        if (commentsSection) commentsSection.style.display = 'none'; // Hide comments
     }

    function hideLoading() {
        if(detailsLoading) detailsLoading.classList.remove('active');
        const mainFlex = document.querySelector('.details-main-flex');
         if (mainFlex) mainFlex.style.visibility = 'visible'; // Show content
         // Comments shown after data load success in fetchAndDisplayDetails
     }

    function showError(message) {
        if(detailsLoading) detailsLoading.classList.remove('active');
        if(detailsError) {
            detailsError.innerHTML = `⚠️ ${message}`; // Use innerHTML to render icon
            detailsError.style.display = 'block';
        }
        // Keep content container visible but hide internal parts or show error within it
        const mainFlex = document.querySelector('.details-main-flex');
        if (mainFlex) mainFlex.style.display = 'none'; // Hide main content area on critical error
        if (commentsSection) commentsSection.style.display = 'none';
    }

    // --- Utility: Update Year in Footer ---
     const currentYearSpanDetails = document.getElementById('currentYearDetails');
     if (currentYearSpanDetails) {
         currentYearSpanDetails.textContent = new Date().getFullYear();
     }

    // --- Initial Load ---
    fetchAndDisplayDetails();

}); // End DOMContentLoaded
