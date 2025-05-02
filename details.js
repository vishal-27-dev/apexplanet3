document.addEventListener('DOMContentLoaded', () => {

    // --- Constants & Setup ---
    const detailsLoading = document.getElementById('details-loading');
    const detailsError = document.getElementById('details-error');
    const detailsContent = document.getElementById('details-content'); // Main content area

    // Elements to populate
    const titleElement = document.getElementById('details-title');
    const pageTitle = document.querySelector('title'); // The <title> tag
    const posterImg = document.getElementById('details-poster-img');
    const plotElement = document.getElementById('details-plot');
    const yearElement = document.getElementById('details-year');
    const genreElement = document.getElementById('details-genre');
    const castElement = document.getElementById('details-cast');
    const ratingElement = document.getElementById('details-rating');
    const imdbLink = document.getElementById('imdb-link');
    const imdbLinkReviews = document.getElementById('imdb-link-reviews');
    const streamingPlaceholder = document.getElementById('streaming-placeholder');

    // API details (must match script.js) - Repetitive, but needed per-page
    const RAPIDAPI_KEY = '30abe74114mshb8417c845d44756p15e916jsnbf3a6a245f97'; // <-- YOUR KEY HERE
    const RAPIDAPI_HOST = 'imdb236.p.rapidapi.com'; // <-- YOUR HOST HERE

    // You NEED to find the correct endpoint for getting DETAILS BY ID in the imdb236 API docs
    // This is a GUESS - REPLACE IT with the actual detail endpoint URL format
    const DETAIL_API_URL_BASE = `https://imdb236.p.rapidapi.com/movie_detail?imdb_id=`;

     const apiOptions = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        }
    };

    // --- Fetch & Display Logic ---

    async function fetchAndDisplayDetails() {
         showLoading();
        try {
            // 1. Get movie ID from URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            const movieId = urlParams.get('id');

            if (!movieId) {
                throw new Error("Movie ID not found in URL.");
            }

             // 2. Basic Key Check
             if (!RAPIDAPI_KEY || RAPIDAPI_KEY.includes('YOUR') || RAPIDAPI_KEY.length < 20) {
                 throw new Error("RapidAPI Key is missing or invalid. Please set it in details.js");
             }

             // 3. Construct Detail API URL
             // IMPORTANT: Check if imdb236 detail endpoint uses imdb_id= or some other param
             const detailUrl = `${DETAIL_API_URL_BASE}${movieId}`;

             // 4. Fetch data from API
             const response = await fetch(detailUrl, apiOptions);
             if (!response.ok) {
                 const errorBody = await response.text();
                 console.error(`API Error (${response.status}) for ID "${movieId}": ${errorBody}`);
                 throw new Error(`API request failed for "${movieId}" with status ${response.status}`);
            }
             const data = await response.json();

            // 5. Check if data is valid
            // IMPORTANT: The structure of 'data' depends entirely on the imdb236 DETAIL endpoint
            // Adapt the checks and property access below based on the actual API response.
             if (!data || (Array.isArray(data) && data.length === 0) /* || !data.title */) { // Add check based on response
                 console.warn("API returned empty or invalid data for ID:", movieId, data);
                 throw new Error("Could not retrieve details for this item.");
             }

            // 6. Populate page elements
            // ===> ADAPT PROPERTY NAMES BASED ON imdb236 DETAIL RESPONSE <===
             const movieDetails = data; // Assuming 'data' is the main detail object

             const movieTitle = movieDetails.title || 'Details'; // ADJUST .title
            titleElement.textContent = movieTitle;
             pageTitle.textContent = `${movieTitle} - Vis Recommendations`; // Update browser tab title

             // Use placeholder if poster URL invalid
             const posterSrc = movieDetails.image && movieDetails.image.startsWith('http') ? movieDetails.image : 'assets/placeholder-poster.png'; // ADJUST .image
            posterImg.src = posterSrc;
            posterImg.alt = `${movieTitle} Poster`;

             plotElement.textContent = movieDetails.plot || movieDetails.description || 'Plot information not available.'; // ADJUST .plot / .description

             yearElement.textContent = movieDetails.year || 'N/A'; // ADJUST .year
             genreElement.textContent = movieDetails.genres ? movieDetails.genres.join(', ') : 'N/A'; // ADJUST .genres
             castElement.textContent = movieDetails.cast ? movieDetails.cast.slice(0, 5).map(actor => actor.name).join(', ') + '...' : 'N/A'; // ADJUST .cast.name, limit cast displayed


            // IMDb Rating & Link
            const ratingValue = movieDetails.rating ? movieDetails.rating.value : null; // ADJUST .rating.value
             if (ratingValue) {
                ratingElement.textContent = `⭐ ${ratingValue}`;
             } else {
                 ratingElement.textContent = 'N/A';
             }
             // Set IMDb link using the ID from URL
             const imdbUrl = `https://www.imdb.com/title/${movieId}/`;
            imdbLink.href = imdbUrl;
            imdbLink.style.display = 'inline';
             imdbLinkReviews.href = `${imdbUrl}reviews`; // Link for reviews placeholder
             imdbLinkReviews.style.display = 'inline';


            // Streaming Info Placeholder (Needs specific API integration)
            populateStreamingInfo(movieDetails.watch_providers); // ADJUST .watch_providers if API provides this

             // 7. Initialize Disqus Comments
            initializeDisqus(movieId, window.location.href);

            hideLoading();

        } catch (error) {
            console.error("Error fetching details:", error);
            showError(error.message || "An error occurred loading details.");
        }
    }

     // Placeholder for populating streaming info - NEEDS API DATA
     function populateStreamingInfo(providersData) {
         streamingPlaceholder.innerHTML = ''; // Clear default message
         if (!providersData || Object.keys(providersData).length === 0) {
             streamingPlaceholder.innerHTML = '<p>Streaming availability data unavailable.</p>';
             return;
         }

         // ===> This part is HIGHLY DEPENDENT on the API's provider data structure <===
         // Example logic if 'providersData' is structured like TMDb's common output
         // const flatrate = providersData.flatrate || [];
         // const buy = providersData.buy || [];
         //
         // if (flatrate.length > 0) {
         //     streamingPlaceholder.innerHTML += '<h4>Stream:</h4>';
         //     flatrate.forEach(p => {
         //         // Assuming p.logo_path needs base URL and p.provider_name exists
         //         // streamingPlaceholder.innerHTML += `<img src="IMAGE_BASE_URL${p.logo_path}" alt="${p.provider_name}" title="${p.provider_name}">`;
         //         streamingPlaceholder.innerHTML += `<span class="provider-logo" title="${p.provider_name}">${p.provider_name}</span> `; // Simple text fallback
         //     });
         // }
         // Add similar logic for 'buy', 'rent' etc.

          // Fallback if structure is unknown or complex for now:
          streamingPlaceholder.innerHTML = '<p>Check popular streaming platforms.</p>';

     }

     function initializeDisqus(pageIdentifier, pageUrl) {
         // IMPORTANT: Ensure disqus_config is available globally *before* embed.js runs
         // This assumes the config setup in details.html runs first.
        if (typeof disqus_config === 'function') {
            disqus_config = function () { // Redefine the function
                this.page.url = pageUrl;
                this.page.identifier = pageIdentifier; // Use movie ID as unique ID
            };
        } else {
             console.warn("Disqus config not found or already processed. Setting directly (might be less reliable).");
             // Less ideal fallback if script timing is off:
             window.DISQUS_CONFIG = { // Attempt direct global set (use if above fails)
                  page: {
                     url: pageUrl,
                     identifier: pageIdentifier
                 }
              };
        }

         // Optional: Reset Disqus if needed for dynamic pages (SPA-like behavior, maybe not needed for Jekyll)
         /*
         if (window.DISQUS) {
             DISQUS.reset({
                 reload: true,
                 config: function () {
                     this.page.url = pageUrl;
                     this.page.identifier = pageIdentifier;
                 }
             });
         }
         */
     }


    function showLoading() {
        detailsLoading.classList.add('active');
        detailsError.style.display = 'none';
        // Optionally hide main content parts while loading
        const mainFlex = document.querySelector('.details-main-flex');
         if (mainFlex) mainFlex.style.opacity = '0.3';
     }

    function hideLoading() {
        detailsLoading.classList.remove('active');
        // Show content
         const mainFlex = document.querySelector('.details-main-flex');
         if (mainFlex) mainFlex.style.opacity = '1';
     }

    function showError(message) {
        detailsLoading.classList.remove('active');
        detailsError.textContent = message;
        detailsError.style.display = 'block';
        // Hide other content areas if error is critical
        const mainFlex = document.querySelector('.details-main-flex');
         if (mainFlex) mainFlex.style.display = 'none';
     }

     // --- Utility: Update Year in Footer ---
     const currentYearSpanDetails = document.getElementById('currentYearDetails');
     if (currentYearSpanDetails) {
         currentYearSpanDetails.textContent = new Date().getFullYear();
     }


    // --- Initial Load ---
    fetchAndDisplayDetails();

}); // End DOMContentLoaded
