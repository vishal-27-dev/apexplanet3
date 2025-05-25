// Wrap the entire script in an Immediately Invoked Function Expression (IIFE)
// to avoid polluting the global scope and ensure 'use strict'.
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {

        // --- DOM Element Selection ---
        const recommendationsGrid = document.getElementById('recommendations-grid');
        const recommendationsLoading = document.getElementById('recommendations-loading');
        const recommendationsError = document.getElementById('recommendations-error');
        const watchlistItemInput = document.getElementById('watchlistItemInput');
        const addWatchlistItemButton = document.getElementById('addWatchlistItemButton');
        const watchlistList = document.getElementById('watchlistList');
        const contactForm = document.getElementById('contactForm');
        const formStatus = document.getElementById('form-status');
        const currentYearSpan = document.getElementById('currentYear');

        // --- Configuration ---
        const recommendationsListFile = 'recommendations.txt';

        // !! IMPORTANT: Critical Configuration - Replace Placeholders !!
        // !! DO NOT COMMIT YOUR ACTUAL KEY TO PUBLIC GITHUB REPOS !!
        const RAPIDAPI_KEY = '30abe74114mshb8417c845d44756p15e916jsnbf3a6a245f97'; // <--- YOUR API KEY HERE
        const RAPIDAPI_HOST = 'imdb236.p.rapidapi.com';          // <--- CORRECT HOST

        // Use the verified Search endpoint (primaryTitle search, 1 result)
        const SEARCH_API_URL_BASE = `https://imdb236.p.rapidapi.com/imdb/search?rows=1&primaryTitle=`;
        // Base URL for constructing IMDb links
        const IMDB_BASE_URL = 'https://www.imdb.com/title/';
        // Path to a local placeholder image
        const PLACEHOLDER_IMAGE_URL = 'assets/placeholder-poster.png';

        // --- API Fetch Options ---
        const apiOptions = {
            method: 'GET',
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST
            }
        };

        // --- Validation & Utility Functions ---
        function isValidIMDbId(id) {
            return typeof id === 'string' && id.startsWith('tt') && id.length > 7;
        }

        function escapeHTML(str) {
             // More robust escaping
             const div = document.createElement('div');
             div.textContent = str;
             return div.innerHTML;
        }

        function updateYear() {
            if (currentYearSpan) {
                currentYearSpan.textContent = new Date().getFullYear();
            }
        }

        function showElement(element, displayType = 'block') {
            if (element) element.style.display = displayType;
        }

        function hideElement(element) {
            if (element) element.style.display = 'none';
        }

        function showLoadingIndicator() {
            showElement(recommendationsLoading, 'flex'); // Assuming flex alignment for spinner+text
            hideElement(recommendationsError);
            hideElement(recommendationsGrid); // Hide content while loading
        }

        function hideLoadingIndicator() {
            hideElement(recommendationsLoading);
            showElement(recommendationsGrid, 'grid'); // Show grid after loading
        }

        function showErrorMessage(message, targetElement = recommendationsError, gridToHide = recommendationsGrid) {
            hideElement(recommendationsLoading);
             if (targetElement) {
                 targetElement.textContent = `⚠️ Error: ${message}`;
                 showElement(targetElement);
             }
             if (gridToHide) {
                 gridToHide.innerHTML = ''; // Clear potentially partial results
                 hideElement(gridToHide);
            }
        }

        // --- Recommendation Fetching Logic ---
        async function fetchRecommendations() {
            if (!recommendationsGrid || !recommendationsLoading || !recommendationsError) {
                console.error("Required recommendation elements not found.");
                return;
            }

            showLoadingIndicator();

            try {
                // 1. Validate API Key format (basic check)
                if (!RAPIDAPI_KEY || RAPIDAPI_KEY.length < 20 || RAPIDAPI_KEY.includes('YOUR')) {
                   throw new Error("RapidAPI Key seems invalid or is a placeholder. Please check script.js.");
                }

                // 2. Fetch title list
                let titles;
                try {
                    const response = await fetch(recommendationsListFile);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    const text = await response.text();
                    titles = text.split('\n').map(t => t.trim()).filter(t => t); // Filter empty lines
                } catch (fileError) {
                     throw new Error(`Could not load '${recommendationsListFile}'. ${fileError.message}`);
                }

                if (titles.length === 0) {
                    showErrorMessage("Recommendation list file is empty.");
                    return; // Stop if no titles
                }

                // 3. Fetch data for each title concurrently
                const searchPromises = titles.map(title => searchMovieByTitle(title));
                const results = await Promise.allSettled(searchPromises);

                // 4. Process results
                recommendationsGrid.innerHTML = ''; // Clear previous results/placeholders
                let successfulFetches = 0;

                results.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value) {
                        renderRecommendationCard(result.value);
                        successfulFetches++;
                    } else {
                        // Handle promise rejection or null return value
                        const reason = result.reason || 'No result returned from search function';
                        console.error(`Failed to get data for "${titles[index]}":`, reason);
                        renderErrorCard(titles[index], reason.message || reason);
                    }
                });

                // 5. Final State Updates
                 if (successfulFetches === 0 && titles.length > 0) {
                     // If fetches were attempted but none succeeded
                     showErrorMessage(`Could not fetch details for any title. Check console, API key/quota, endpoint, and list file content.`);
                 } else {
                    // If successful fetches or just errors rendered, hide main loading
                    hideLoadingIndicator();
                }

            } catch (error) {
                // Catch errors from validation or file loading
                console.error("Fatal error fetching recommendations:", error);
                showErrorMessage(error.message || "An unexpected error occurred.");
            }
        } // end fetchRecommendations

        async function searchMovieByTitle(title) {
            const searchUrl = `${SEARCH_API_URL_BASE}${encodeURIComponent(title)}`;
            try {
                const response = await fetch(searchUrl, apiOptions);

                if (!response.ok) {
                     const errorDetails = await response.text(); // Get error detail from API if possible
                     throw new Error(`API returned status ${response.status} for "${title}". ${errorDetails}`);
                }

                const data = await response.json();

                if (!data?.results?.length) { // Optional chaining for safety
                    console.warn(`No valid results found for title: "${title}"`);
                    return null; // Indicate no useful result
                }

                const firstResult = data.results[0];

                 // Validate essential ID
                if (!isValidIMDbId(firstResult.id)) {
                    console.warn(`Result for "${title}" is missing a valid IMDb ID ('tt...'):`, firstResult);
                    return null;
                }

                // Map to consistent structure
                return {
                    id: firstResult.id,
                    title: firstResult.primaryTitle || title, // Fallback to original search term
                    year: firstResult.startYear || null,
                    genre: Array.isArray(firstResult.genres) ? firstResult.genres.join(', ') : 'N/A',
                    poster: firstResult.primaryImage || null, // URL or null
                    rating: firstResult.averageRating || null // Number or null
                };

            } catch (error) {
                 console.error(`Network or processing error searching for "${title}":`, error);
                 // Don't return null here, re-throw to be caught by Promise.allSettled
                 throw error;
             }
        } // end searchMovieByTitle

        function renderRecommendationCard(movieData) {
             if (!movieData?.id) return; // Guard clause

             const cardLink = document.createElement('a');
            cardLink.href = `details.html?id=${movieData.id}`;
             cardLink.classList.add('recommendation-card-link');
            cardLink.setAttribute('title', `View details for ${escapeHTML(movieData.title)}`);

             const card = document.createElement('div');
             card.classList.add('recommendation-card');

             const posterSrc = movieData.poster && movieData.poster.startsWith('http') ? movieData.poster : PLACEHOLDER_IMAGE_URL;
             const ratingText = movieData.rating ? `⭐ ${movieData.rating.toFixed(1)}` : ''; // Format rating to 1 decimal

             card.innerHTML = `
                <img src="${escapeHTML(posterSrc)}" alt="${escapeHTML(movieData.title)} Poster" loading="lazy" onerror="this.onerror=null; this.src='${PLACEHOLDER_IMAGE_URL}';">
                 <div class="card-content">
                     <h3>${escapeHTML(movieData.title)}</h3>
                     <p class="card-meta">${movieData.year || ''} | ${escapeHTML(movieData.genre) || 'N/A'}</p>
                     <div class="rating">${ratingText}</div>
                 </div>
             `;

             cardLink.appendChild(card);
             recommendationsGrid.appendChild(cardLink);
         } // end renderRecommendationCard

        function renderErrorCard(title, errorMessage = "Could not load details.") {
             const errorCard = document.createElement('div');
             errorCard.classList.add('recommendation-card', 'error-state');
             errorCard.setAttribute('title', `Error loading details for ${escapeHTML(title)}: ${escapeHTML(errorMessage)}`);

             errorCard.innerHTML = `
                 <img src="${PLACEHOLDER_IMAGE_URL}" alt="Error placeholder" loading="lazy">
                 <div class="card-content error-content">
                     <h3>${escapeHTML(title)}</h3>
                     <p class="card-meta error-message-small">⚠️ ${escapeHTML(errorMessage)}</p>
                 </div>`;

             recommendationsGrid.appendChild(errorCard);
         } // end renderErrorCard

        // --- Watchlist Logic ---
        if (addWatchlistItemButton && watchlistItemInput && watchlistList) {
             addWatchlistItemButton.addEventListener('click', handleAddItem);
             watchlistItemInput.addEventListener('keypress', (event) => {
                 if (event.key === 'Enter') { event.preventDefault(); handleAddItem(); }
             });
             watchlistList.addEventListener('click', (event) => {
                 if (event.target.classList.contains('remove-watchlist-btn')) {
                     removeItem(event.target.closest('li'));
                 }
             });
         } else {
            console.warn("Watchlist elements not found. Watchlist functionality disabled.");
         }

        function handleAddItem() {
             const itemText = watchlistItemInput.value.trim();
             if (!itemText) return;
             createWatchlistItem(itemText);
             watchlistItemInput.value = '';
             watchlistItemInput.focus();
         }

        function createWatchlistItem(itemText) {
             const li = document.createElement('li');
             li.innerHTML = `
                 <span>${escapeHTML(itemText)}</span>
                 <button class="remove-watchlist-btn" aria-label="Remove ${escapeHTML(itemText)} from watchlist" title="Remove Item">×</button>
             `;
             watchlistList.appendChild(li);
         }

        function removeItem(itemElement) {
             if (itemElement?.parentNode === watchlistList) { // Optional chaining for safety
                 itemElement.remove();
             }
         }

        // --- Contact Form Logic ---
         if (contactForm && formStatus) {
             const formEndpoint = contactForm.getAttribute('action');

             if (!formEndpoint || (!formEndpoint.startsWith('https://formspree.io') && !formEndpoint.startsWith('https://formsubmit.co'))) {
                  console.error("Contact form 'action' URL is missing or invalid. Form submission disabled.");
                  setStatus("Form is not configured properly.", "error");
                  contactForm.addEventListener('submit', e => e.preventDefault()); // Prevent submission
             } else {
                  // Setup form elements for validation
                 const nameInput = document.getElementById('name');
                 const emailInput = document.getElementById('email'); // Should use name="_replyto" for formspree/email for formsubmit
                 const messageInput = document.getElementById('message');
                 const formFields = [ // Use for simpler iteration
                      { input: nameInput, required: true, name: "Name" },
                      { input: emailInput, required: true, name: "Email", isEmail: true },
                      { input: messageInput, required: true, name: "Message" }
                  ];

                 contactForm.addEventListener('submit', async (event) => {
                      event.preventDefault();
                      setStatus('', ''); // Clear status on new submit

                      // Client-side Validation
                      let isValid = true;
                      clearAllFormErrors(formFields);
                     formFields.forEach(field => {
                          if (!validateField(field.input, field.required, field.isEmail, field.name)) {
                              isValid = false;
                          }
                     });

                      if (!isValid) {
                           setStatus("Please correct the errors marked below.", "error");
                          const firstErrorField = contactForm.querySelector('.input-error');
                          if(firstErrorField) firstErrorField.focus();
                          return;
                      }

                     // Send data if valid
                     const formData = new FormData(contactForm);
                     setStatus('Sending message...', '');
                     const submitButton = contactForm.querySelector('button[type="submit"]');
                      if(submitButton) submitButton.disabled = true;

                      try {
                          const response = await fetch(formEndpoint, {
                              method: 'POST',
                              body: formData,
                              headers: { 'Accept': 'application/json' }
                          });

                          if (response.ok) {
                               setStatus('Message sent successfully! Thank you.', 'success');
                               contactForm.reset(); // Clear form on success
                           } else {
                               // Try to get error from response, default if not
                                let errorMsg = `Submission failed (Status: ${response.status})`;
                                try {
                                    const responseData = await response.json();
                                     errorMsg = responseData.errors ? responseData.errors.map(e => e.message || e.error).join(', ') : errorMsg;
                                } catch (parseError) { /* Ignore if response is not JSON */ }
                                throw new Error(errorMsg);
                           }
                      } catch (error) {
                           console.error("Contact form submission error:", error);
                           setStatus(`Error: ${error.message || 'Could not send message.'}`, 'error');
                      } finally {
                           if(submitButton) submitButton.disabled = false; // Re-enable button
                     }
                  }); // end event listener

                   // Add live validation feedback (optional but nice UX)
                  formFields.forEach(field => {
                     field.input?.addEventListener('input', () => validateField(field.input, field.required, field.isEmail, field.name));
                     field.input?.addEventListener('blur', () => validateField(field.input, field.required, field.isEmail, field.name)); // Validate on blur too
                   });

              } // end else for valid endpoint check

         } else {
              console.warn("Contact form elements not found. Contact functionality disabled.");
         } // end contact form setup

        // Contact form validation helpers
        function validateField(inputElement, isRequired, isEmailType, fieldName) {
             if (!inputElement) return true; // Should not happen if setup correctly
            let isValid = true;
             let errorMessage = '';
            const value = inputElement.value.trim();

            if (isRequired && value === '') {
                isValid = false;
                errorMessage = 'This field is required.';
            } else if (isEmailType && value !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { // Simple email regex
                isValid = false;
                 errorMessage = 'Please enter a valid email address.';
            }

            setFieldError(inputElement, errorMessage);
            return isValid;
         }

        function setFieldError(inputElement, message) {
            const formGroup = inputElement.closest('.form-group');
            if (!formGroup) return;
            const errorElement = formGroup.querySelector('.error-message');

             if (message) {
                 if (errorElement) errorElement.textContent = message;
                 inputElement.classList.add('input-error');
                 inputElement.setAttribute('aria-invalid', 'true'); // Accessibility
             } else {
                 if (errorElement) errorElement.textContent = ''; // Clear message
                 inputElement.classList.remove('input-error');
                 inputElement.removeAttribute('aria-invalid');
             }
         }

         function clearAllFormErrors(fields) {
            fields.forEach(field => {
                if (field.input) setFieldError(field.input, '');
             });
         }

        function setStatus(message, type) { // type = 'success' or 'error'
             if (!formStatus) return;
             formStatus.textContent = message;
             formStatus.className = 'form-status-message'; // Reset class
             if (type) formStatus.classList.add(type);
             // Accessibility: make status message an alert
             formStatus.setAttribute('role', 'alert');
         }

        // --- Initial Setup Calls ---
        updateYear();
        fetchRecommendations(); // Start the main data fetching process

    }); // End DOMContentLoaded Listener

})(); // End IIFE
