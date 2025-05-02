document.addEventListener('DOMContentLoaded', () => {

    // --- Constants and Setup ---
    const recommendationsGrid = document.getElementById('recommendations-grid');
    const recommendationsLoading = document.getElementById('recommendations-loading');
    const recommendationsError = document.getElementById('recommendations-error');
    const recommendationsListFile = 'recommendations.txt'; // Your list file

    // API Credentials (Ensure they are correct)
    const RAPIDAPI_KEY = '30abe74114mshb8417c845d44756p15e916jsnbf3a6a245f97'; // Your key
    const RAPIDAPI_HOST = 'imdb236.p.rapidapi.com';     // Correct Host

    // API Search Endpoint Base URL (Uses primaryTitle as per your example)
    // Using rows=1 to get the most relevant result per title.
    const SEARCH_API_URL_BASE = `https://imdb236.p.rapidapi.com/imdb/search?rows=1&primaryTitle=`;

    const apiOptions = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        }
    };

    // --- Recommendation Loading ---

    async function fetchRecommendations() {
        if (!recommendationsGrid || !recommendationsLoading || !recommendationsError) return;

        showLoading();
        try {
             if (!RAPIDAPI_KEY || RAPIDAPI_KEY.length < 20 || RAPIDAPI_KEY.includes('YOUR')) {
                throw new Error("RapidAPI Key is missing or seems invalid in script.js");
             }

            const response = await fetch(recommendationsListFile);
            if (!response.ok) {
                throw new Error(`Failed to load ${recommendationsListFile}: ${response.statusText}`);
            }
            const text = await response.text();
            const titles = text.split('\n').map(title => title.trim()).filter(title => title.length > 0);

            if (titles.length === 0) {
                showError("No recommendation titles found in the list file.");
                return;
            }

            const movieDataPromises = titles.map(title => searchMovieByTitle(title));
            // Wait for all API calls to settle (complete or fail)
            const movieResults = await Promise.allSettled(movieDataPromises);

            recommendationsGrid.innerHTML = ''; // Clear grid before rendering
            let foundResults = false;
            movieResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    // API call was successful and returned data
                    renderRecommendationCard(result.value);
                    foundResults = true;
                } else {
                    // API call failed or returned null/undefined
                    console.error(`Failed to process "${titles[index]}":`, result.reason || 'No result data returned from search');
                    // Optionally, render an error placeholder for this specific title
                    renderErrorCard(titles[index]); // Show users something failed for this item
                }
            });

            if (!foundResults && titles.length > 0) { // Only show general error if nothing worked
                 showError("Could not fetch details for any recommendations. Check API key, endpoint, or titles.");
             } else if (!foundResults && titles.length === 0) {
                 // This case handled earlier
             } else {
                 hideLoading(); // Hide loading only if we got at least one result or card (incl. error cards)
             }

        } catch (error) {
            console.error("Error in fetchRecommendations:", error);
            showError(error.message || "An unknown error occurred while loading recommendations.");
        }
    }

    async function searchMovieByTitle(title) {
        // Construct the search URL using primaryTitle and fetch only 1 row
        const searchUrl = `${SEARCH_API_URL_BASE}${encodeURIComponent(title)}`;

        try {
            const response = await fetch(searchUrl, apiOptions);

            if (!response.ok) {
                 const errorText = await response.text(); // Get more details if available
                 console.error(`API Error (${response.status}) for "${title}": ${errorText}`);
                 throw new Error(`API request failed for "${title}" (Status: ${response.status})`);
            }

            const data = await response.json();

            // Check the structure based on your sample response
            if (!data || !data.results || data.results.length === 0) {
                console.warn(`No API results found for "${title}"`);
                return null; // Explicitly return null if no results
            }

            // Use the first result from the 'results' array
            const firstResult = data.results[0];

            // Extract data using the EXACT keys from your sample JSON
            return {
                id: firstResult.id,                      // e.g., "tt6473300" (Required for details link)
                title: firstResult.primaryTitle,         // e.g., "Mirzapur"
                year: firstResult.startYear,             // e.g., 2018
                genre: firstResult.genres ? firstResult.genres.join(', ') : 'N/A', // e.g., "Action, Crime, Thriller"
                poster: firstResult.primaryImage,        // e.g., URL string or null
                rating: firstResult.averageRating        // e.g., 8.4 or null
            };

        } catch (error) {
            console.error(`Error fetching or processing data for "${title}":`, error);
            // Re-throw or return null so Promise.allSettled can catch it
             throw error; // Rethrowing helps identify the failing promise's reason
             // return null; // Alternatively, just return null on failure
        }
    }

    function renderRecommendationCard(movieData) {
        if (!movieData || !movieData.id) {
            console.warn("Attempted to render card with missing data or ID:", movieData);
            return;
        }

        const cardLink = document.createElement('a');
        cardLink.href = `details.html?id=${movieData.id}`;
        cardLink.classList.add('recommendation-card-link');
        cardLink.setAttribute('title', `View details for ${movieData.title || 'this item'}`);

        const card = document.createElement('div');
        card.classList.add('recommendation-card');

        // Handle potentially null poster
        const posterSrc = movieData.poster && movieData.poster.startsWith('http')
                          ? movieData.poster
                          : 'assets/placeholder-poster.png'; // Ensure this placeholder exists

        // Handle potentially null rating
        const ratingText = movieData.rating ? `⭐ ${movieData.rating}` : '';

        card.innerHTML = `
            <img src="${posterSrc}" alt="${movieData.title || ''} Poster" loading="lazy" onerror="this.onerror=null; this.src='assets/placeholder-poster.png';">
            <div class="card-content">
                <h3>${movieData.title || 'Title Unavailable'}</h3>
                <p class="card-meta">${movieData.year || ''} | ${movieData.genre || 'N/A'}</p>
                <div class="rating">${ratingText}</div>
            </div>
        `;

        cardLink.appendChild(card);
        recommendationsGrid.appendChild(cardLink);
    }

    function renderErrorCard(title) {
        const errorCard = document.createElement('div');
        errorCard.classList.add('recommendation-card', 'error-card');
        // Provide some visual indication of failure for this specific title
        errorCard.innerHTML = `
             <div class="card-content error-content">
                 <h3>${escapeHTML(title) || 'Unknown Title'}</h3>
                 <p class="card-meta">Failed to load details</p>
                 <div class="rating">⚠️</div>
             </div>`;
         errorCard.style.opacity = '0.7'; // Example style for error card
         errorCard.style.border = '1px dashed #555';
        recommendationsGrid.appendChild(errorCard);
    }

    function showLoading() {
        if(recommendationsLoading) recommendationsLoading.classList.add('active');
        if(recommendationsError) recommendationsError.style.display = 'none';
        if(recommendationsGrid) recommendationsGrid.style.display = 'none'; // Hide grid while loading
    }

    function hideLoading() {
        if(recommendationsLoading) recommendationsLoading.classList.remove('active');
        if(recommendationsGrid) recommendationsGrid.style.display = 'grid'; // Show grid after loading
    }

    function showError(message) {
        if(recommendationsLoading) recommendationsLoading.classList.remove('active');
        if(recommendationsError) {
            recommendationsError.textContent = message;
            recommendationsError.style.display = 'block';
        }
        if(recommendationsGrid) {
             recommendationsGrid.innerHTML = ''; // Clear potentially partial results on error
            recommendationsGrid.style.display = 'none'; // Hide grid on error
        }
    }


    // --- Watchlist Logic --- (Unchanged, keep as is)
    const watchlistItemInput = document.getElementById('watchlistItemInput');
    const addWatchlistItemButton = document.getElementById('addWatchlistItemButton');
    const watchlistList = document.getElementById('watchlistList');

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
    }
    function handleAddItem() { /* ... (keep existing function) ... */
         const itemText = watchlistItemInput.value.trim(); if (itemText === '') return; createWatchlistItem(itemText); watchlistItemInput.value = ''; watchlistItemInput.focus();
     }
    function createWatchlistItem(itemText) { /* ... (keep existing function) ... */
         const li = document.createElement('li'); li.innerHTML = `<span>${escapeHTML(itemText)}</span> <button class="remove-watchlist-btn" title="Remove Item">×</button>`; watchlistList.appendChild(li);
     }
    function removeItem(itemElement) { /* ... (keep existing function) ... */
         if (itemElement && itemElement.parentNode === watchlistList) { itemElement.remove(); }
     }
     function escapeHTML(str) { /* ... (keep existing function) ... */
         return str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, ''');
     }

    // --- Contact Form Logic --- (Unchanged, ensure FORMSPREE_ENDPOINT is set or use formsubmit.co)
    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('form-status');

    if (contactForm && formStatus) {
        // Ensure your Formspree endpoint (or formsubmit.co action) is correctly set in index.html
        const FORM_ENDPOINT = contactForm.getAttribute('action');

        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const messageInput = document.getElementById('message');
        const fieldsToValidate = [
            { input: nameInput, required: true, name: "Name" },
            { input: emailInput, required: true, name: "Email", isEmail: true },
            { input: messageInput, required: true, name: "Message" }
        ];

        contactForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            setStatus('', ''); // Clear status

            // Client-side validation first
            let isFormValid = true;
            clearAllErrors(fieldsToValidate);
            fieldsToValidate.forEach(fieldObj => { /* ... (keep validation check logic) ... */
                const { input, required, name, isEmail } = fieldObj;
                const value = input.value.trim();
                if (required && value === '') { isFormValid = false; showError(input, `Required`); }
                 else if (isEmail && value !== '' && !validateEmailFormat(value)) { isFormValid = false; showError(input, `Invalid Email`); }
             });

            if (!isFormValid) {
                 setStatus('Please fix errors above.', 'error');
                 const firstErrorField = contactForm.querySelector('.input-error');
                 if(firstErrorField) firstErrorField.focus();
                return;
            }

            // Send data via fetch
            const formData = new FormData(contactForm);
            setStatus('Sending...', '');
            try {
                if (!FORM_ENDPOINT) throw new Error("Form action URL is missing.");

                const response = await fetch(FORM_ENDPOINT, {
                    method: 'POST', body: formData, headers: {'Accept': 'application/json'}
                });
                if (response.ok) {
                    setStatus('Message sent successfully!', 'success');
                    contactForm.reset();
                } else {
                     const responseData = await response.json().catch(()=>({})); // Catch if no JSON body
                     const errorMessage = responseData.errors ? responseData.errors.map(e => e.message || e.error).join(', ') : `Request failed (${response.status})`;
                     throw new Error(errorMessage);
                }
            } catch (error) {
                 console.error("Form submission error:", error);
                 setStatus(`Error: ${error.message || 'Could not send message.'}`, 'error');
            }
        });
        // Clear errors on input
        fieldsToValidate.forEach(fieldObj => fieldObj.input.addEventListener('input', () => clearError(fieldObj.input)));
    }
    // Form helpers (unchanged, keep as is)
    function setStatus(message, type) { /* ... */ if (!formStatus) return; formStatus.textContent = message; formStatus.className = 'form-status-message'; if (type) formStatus.classList.add(type); }
    function showError(inputElement, message) { /* ... */ clearError(inputElement); const formGroup = inputElement.closest('.form-group'); if (formGroup) { const errorElement = formGroup.querySelector('.error-message'); if (errorElement) errorElement.textContent = message; inputElement.classList.add('input-error'); }}
    function clearError(inputElement) { /* ... */ const formGroup = inputElement.closest('.form-group'); if (formGroup) { const errorElement = formGroup.querySelector('.error-message'); if (errorElement) errorElement.textContent = ''; inputElement.classList.remove('input-error'); } }
    function clearAllErrors(fields) { /* ... */ fields.forEach(fieldObj => clearError(fieldObj.input)); }
    function validateEmailFormat(email) { /* ... */ const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; return re.test(String(email).toLowerCase()); }

    // --- Utility: Update Year in Footer --- (Unchanged)
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) { currentYearSpan.textContent = new Date().getFullYear(); }

    // --- Initial Load ---
    fetchRecommendations(); // Start fetching data when the page loads

}); // End DOMContentLoaded
