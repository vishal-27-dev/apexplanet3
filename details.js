// Wrap in IIFE
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {

        // --- DOM Element Selection ---
        const detailsLoading = document.getElementById('details-loading');
        const detailsError = document.getElementById('details-error');
        // Get containers for content hiding/showing
        const detailsHeader = document.querySelector('.details-header');
        const detailsContentArea = document.getElementById('details-content'); // Contains poster/info flex
        const commentsSection = document.getElementById('comments-section');

        // Elements to populate within detailsContentArea
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
        const currentYearSpanDetails = document.getElementById('currentYearDetails');

        // --- Configuration ---
        // !! IMPORTANT: Critical Configuration - Replace Placeholders !!
        const RAPIDAPI_KEY = '30abe74114mshb8417c845d44756p15e916jsnbf3a6a245f97'; // <--- YOUR API KEY HERE
        const RAPIDAPI_HOST = 'imdb236.p.rapidapi.com';          // <--- CORRECT HOST

        // !! CRITICAL ASSUMPTION - Verify and Replace !!
        // Find the EXACT endpoint URL in imdb236 docs for getting details BY IMDb ID (e.g., tt...).
        const DETAIL_API_URL_BASE = `https://imdb236.p.rapidapi.com/get_detail?id=`; // <--- LIKELY GUESS - VERIFY & REPLACE

        // Constants
        const IMDB_BASE_URL = 'https://www.imdb.com/title/';
        const PLACEHOLDER_IMAGE_URL = 'assets/placeholder-poster.png';

        // --- API Fetch Options ---
        const apiOptions = {
            method: 'GET',
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST
            }
        };

        // --- Utility Functions ---
         function showElement(element, displayType = 'block') {
            if (element) element.style.display = displayType;
        }
         function hideElement(element) {
            if (element) element.style.display = 'none';
        }
         function escapeHTML(str) {
             const div = document.createElement('div'); div.textContent = str; return div.innerHTML;
         }
         function updateYearDetails() {
            if (currentYearSpanDetails) currentYearSpanDetails.textContent = new Date().getFullYear();
         }
         function isValidIMDbId(id) {
             return typeof id === 'string' && id.startsWith('tt') && id.length > 7;
         }

         function showLoadingIndicator() {
             showElement(detailsLoading, 'flex');
             hideElement(detailsError);
             // Hide main content sections gently while loading
             if (detailsHeader) detailsHeader.style.opacity = '0.3';
             if (detailsContentArea) detailsContentArea.style.visibility = 'hidden';
             hideElement(commentsSection);
         }

         function hideLoadingIndicator() {
             hideElement(detailsLoading);
             // Restore visibility/opacity
             if (detailsHeader) detailsHeader.style.opacity = '1';
             if (detailsContentArea) detailsContentArea.style.visibility = 'visible';
             // Comments are shown later after Disqus init
         }

        function showErrorMessage(message) {
             hideLoadingIndicator(); // Ensure loading is hidden
             if (detailsError) {
                 detailsError.innerHTML = `⚠️ Error: ${escapeHTML(message)}`;
                 showElement(detailsError);
             }
             // Hide the potentially broken content area
             hideElement(detailsContentArea);
             hideElement(commentsSection);
             // Update titles to show error
             if(titleElement) titleElement.textContent = 'Error Loading Details';
             if(pageTitle) pageTitle.textContent = 'Error - Vis Recommendations';
        }


        // --- Main Fetch & Display Logic ---
        async function fetchAndDisplayDetails() {
            // Hide elements until ready
             hideElement(detailsError);
            hideElement(commentsSection);
            showLoadingIndicator();

            let movieId = ''; // Declare movieId in outer scope for Disqus config

            try {
                 // 1. Get and Validate ID, Key, Endpoint
                 const urlParams = new URLSearchParams(window.location.search);
                 movieId = urlParams.get('id'); // Assign to outer scope variable
                 if (!isValidIMDbId(movieId)) throw new Error("Valid Movie ID ('tt...') not found in URL.");
                 if (!RAPIDAPI_KEY || RAPIDAPI_KEY.length < 20 || RAPIDAPI_KEY.includes('YOUR')) throw new Error("RapidAPI Key is invalid or placeholder in details.js.");
                 if (!DETAIL_API_URL_BASE || DETAIL_API_URL_BASE.includes('YOUR_ACTUAL_ENDPOINT') || DETAIL_API_URL_BASE.includes('get_detail?id=')) { // Strengthen check for placeholder
                      // Note: Removed specific check against 'get_detail?id=' if that *might* be correct, adjust as needed
                     console.warn(`Using assumed detail endpoint: ${DETAIL_API_URL_BASE}. Verify this is correct in the imdb236 documentation.`);
                     // throw new Error("Detail API endpoint URL is not correctly set or verified in details.js.");
                 }

                 // 2. Fetch Data
                 const detailUrl = `${DETAIL_API_URL_BASE}${movieId}`;
                 const response = await fetch(detailUrl, apiOptions);
                 if (!response.ok) {
                     const errorText = await response.text();
                      throw new Error(`API request failed for "${movieId}" (Status: ${response.status}). Detail Endpoint Response: ${errorText}`);
                 }
                 const data = await response.json();

                 // 3. --- !!! PARSE RESPONSE - CRITICAL AREA !!! ---
                 // You MUST adapt the 'data.propertyName' access below based on the *ACTUAL JSON structure*
                 // returned by *YOUR specific DETAIL endpoint URL*. Inspect using Network Tab!
                 if (!data /* || !data.some_essential_property */ ) {
                      throw new Error("API returned empty or invalid data structure for the detail endpoint.");
                  }
                  const movieDetails = data; // Assuming root object holds details - VERIFY!

                 // 4. Populate Page (using optional chaining ?. for safety)
                 const movieTitle = movieDetails?.primaryTitle || movieDetails?.title || 'Details Unavailable'; // VERIFY PROPERTY
                 titleElement.textContent = movieTitle;
                 pageTitle.textContent = `${movieTitle} - Vis Recommendations`;

                 const posterSrc = (movieDetails?.primaryImage || movieDetails?.image)?.startsWith('http') // VERIFY PROPERTY
                                  ? (movieDetails.primaryImage || movieDetails.image)
                                  : PLACEHOLDER_IMAGE_URL;
                 posterImg.src = posterSrc;
                 posterImg.alt = `${escapeHTML(movieTitle)} Poster`;
                 posterImg.onerror = () => { posterImg.src = PLACEHOLDER_IMAGE_URL; }; // Fallback on image load error

                 plotElement.textContent = movieDetails?.plot || movieDetails?.description || 'Plot summary not available.'; // VERIFY PROPERTY

                 yearElement.textContent = movieDetails?.startYear || movieDetails?.year || 'N/A'; // VERIFY PROPERTY
                 genreElement.textContent = Array.isArray(movieDetails?.genres) ? movieDetails.genres.join(', ') : 'N/A'; // VERIFY PROPERTY

                 // Rating
                 ratingElement.textContent = movieDetails?.averageRating ? `⭐ ${movieDetails.averageRating.toFixed(1)}` : 'N/A'; // VERIFY PROPERTY

                 // Cast - Attempting more robust check (VERIFY properties like .actors/.cast and .name)
                  let castText = 'Cast information not available.';
                  const castList = movieDetails?.actors || movieDetails?.cast; // VERIFY which property holds the array
                  if (Array.isArray(castList)) {
                      const castNames = castList
                          .map(actor => actor?.name) // VERIFY actor object has '.name' property
                          .filter(name => name)      // Remove falsy names
                          .slice(0, 6);             // Limit displayed cast
                      if (castNames.length > 0) {
                          castText = castNames.join(', ') + (castList.length > 6 ? '...' : '');
                      }
                  }
                 castElement.textContent = escapeHTML(castText);

                 // IMDb Links (Should work if ID is correct)
                 const imdbUrl = `${IMDB_BASE_URL}${movieId}/`;
                 if (imdbLink) { imdbLink.href = imdbUrl; showElement(imdbLink, 'inline'); }
                 if (imdbLinkReviews) { imdbLinkReviews.href = `${imdbUrl}reviews`; showElement(imdbLinkReviews, 'inline'); }

                 // Streaming Info Placeholder (Pass potential links if available)
                 populateStreamingInfo(movieDetails?.externalLinks); // VERIFY 'externalLinks' property name

                 // 5. Data loaded successfully, now init Disqus and show content
                 hideLoadingIndicator();
                 initializeDisqus(movieId, window.location.href);
                 showElement(commentsSection);

            } catch (error) {
                 // Catch errors from validation, fetch, or parsing
                 console.error("Failed to load details:", error);
                 showErrorMessage(error.message || "An unexpected error occurred while loading details.");
             }
        } // end fetchAndDisplayDetails

        function populateStreamingInfo(links) {
             if (!streamingPlaceholder) return;
             streamingPlaceholder.innerHTML = ''; // Clear
             let linkContent = '<p>Specific streaming links may not be available via this source. Please check common platforms.</p>'; // Default

             if (Array.isArray(links) && links.length > 0) {
                 let foundLinksHtml = '';
                 links.forEach(link => {
                     if (typeof link === 'string' && link.startsWith('http')) {
                         try {
                              const url = new URL(link);
                              // Simple display: hostname as link text
                             const hostname = url.hostname.replace(/^www\./, '');
                              foundLinksHtml += `<a href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHTML(hostname)}</a> `;
                         } catch (e) { /* Ignore invalid URLs */ }
                     } else if (typeof link?.url === 'string' && link.url.startsWith('http')) {
                         // Handle object format like { url: '...', name: '...' } if API uses it
                         const providerName = link.name || new URL(link.url).hostname.replace(/^www\./, '');
                         foundLinksHtml += `<a href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHTML(providerName)}</a> `;
                    }
                 });
                 if (foundLinksHtml) {
                     linkContent = `<h5>Check Availability:</h5> ${foundLinksHtml.trim()}`;
                 }
             }
             streamingPlaceholder.innerHTML = linkContent;
         } // end populateStreamingInfo

         function initializeDisqus(pageIdentifier, pageUrl) {
             if (typeof disqus_config === 'function') {
                 console.warn("Disqus config function found - ensure it runs AFTER setting identifier/url.");
             }

             // Define/redefine config for Disqus embed script to pick up
             window.disqus_config = function () {
                this.page.url = pageUrl;
                this.page.identifier = pageIdentifier;
             };

             // Check if Disqus embed script needs loading or if just needs reset
             const disqusScript = document.getElementById('dsq-embed-scr'); // Assume embed.js has this ID or add it
             if (!disqusScript && document.getElementById('disqus_thread')) {
                 // If script tag not found but thread exists, try to load it dynamically (if initial load failed?)
                 // Ensure YOUR_SHORTNAME is replaced in details.html first!
                 console.log("Attempting to load Disqus embed script dynamically.");
                 (function() {
                     var d = document, s = d.createElement('script');
                     s.id = 'dsq-embed-scr'; // Add ID for future checks
                     // MAKE SURE this matches the one in details.html, including your shortname!
                     s.src = 'https://vis-recommendations.disqus.com/embed.js'; // REPLACE vis-recommendations
                     s.setAttribute('data-timestamp', +new Date());
                     (d.head || d.body).appendChild(s);
                 })();
             } else if (window.DISQUS) {
                  // If Disqus is already loaded (e.g., SPA navigation), reset it
                  console.log("Disqus found, resetting thread.");
                  DISQUS.reset({
                     reload: true,
                      config: window.disqus_config // Pass the config function again
                  });
              } else {
                  console.log("Disqus config set. Waiting for embed script in HTML to load.");
             }
         } // end initializeDisqus

        // --- Initial Setup Calls ---
        updateYearDetails();
        fetchAndDisplayDetails(); // Start the process

    }); // End DOMContentLoaded Listener

})(); // End IIFE
