document.addEventListener('DOMContentLoaded', function() {

    // --- Form Validation Logic (Task 2 - Existing) ---
    const contactForm = document.getElementById('contactForm');
    const formSuccessMessage = document.getElementById('formSuccessMessage');

    if (contactForm) {
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const subjectInput = document.getElementById('subject');
        const messageInput = document.getElementById('message');

        const fieldsToValidate = [
            { input: nameInput, required: true, name: "Name" },
            { input: emailInput, required: true, name: "Email", isEmail: true },
            { input: subjectInput, required: false },
            { input: messageInput, required: true, name: "Message" }
        ];

        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();
            let isFormValid = true;

            clearAllErrors(fieldsToValidate);
            if (formSuccessMessage) formSuccessMessage.style.display = 'none';

            fieldsToValidate.forEach(fieldObj => {
                const { input, required, name, isEmail } = fieldObj;
                const value = input.value.trim();

                if (required && value === '') {
                    isFormValid = false;
                    showError(input, `${name} is required.`);
                } else if (isEmail && value !== '' && !validateEmailFormat(value)) {
                    isFormValid = false;
                    showError(input, `Please enter a valid email address.`);
                }
            });

            if (isFormValid) {
                console.log('Form is valid. Simulating submission...');
                if (formSuccessMessage) {
                    formSuccessMessage.textContent = 'Thank you! Your message has been received.';
                    formSuccessMessage.style.display = 'block';
                }
                contactForm.reset();
                setTimeout(() => {
                    if (formSuccessMessage) formSuccessMessage.style.display = 'none';
                }, 5000);
            } else {
                console.log('Form validation failed.');
                const firstErrorField = contactForm.querySelector('.input-error');
                if (firstErrorField) firstErrorField.focus();
            }
        });

        fieldsToValidate.forEach(fieldObj => {
            if (fieldObj.input) { // Ensure input exists before adding listener
                fieldObj.input.addEventListener('input', () => clearError(fieldObj.input));
            }
        });
    }

    function showError(inputElement, message) {
        if (!inputElement) return;
        const formGroup = inputElement.closest('.form-group');
        if (formGroup) {
            const errorElement = formGroup.querySelector('.error-message');
            if (errorElement) {
                errorElement.textContent = message;
            }
            inputElement.classList.add('input-error');
        }
    }

    function clearError(inputElement) {
        if (!inputElement) return;
        const formGroup = inputElement.closest('.form-group');
        if (formGroup) {
            const errorElement = formGroup.querySelector('.error-message');
            if (errorElement) {
                errorElement.textContent = '';
            }
            inputElement.classList.remove('input-error');
        }
    }

    function clearAllErrors(fields) {
        fields.forEach(fieldObj => clearError(fieldObj.input));
    }

    function validateEmailFormat(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    // --- To-Do List Logic (Task 2 - Existing) ---
    const todoInput = document.getElementById('todoInput');
    const addTodoButton = document.getElementById('addTodoButton');
    const todoList = document.getElementById('todoList');

    if (addTodoButton && todoInput && todoList) {
        addTodoButton.addEventListener('click', handleAddTask);
        todoInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleAddTask();
            }
        });

        todoList.addEventListener('click', function(event) {
            const target = event.target;
            const removeButton = target.closest('.remove-todo-btn');
            if (removeButton) {
                const liToRemove = removeButton.closest('li');
                if (liToRemove) removeTask(liToRemove);
                return;
            }
            const listItem = target.closest('li');
            if (listItem && !target.closest('.remove-todo-btn')) {
                toggleTaskComplete(listItem);
            }
        });
    }

    function handleAddTask() {
        const taskText = todoInput.value.trim();
        if (taskText === '') {
            alert('Task cannot be empty!');
            return;
        }
        createTaskElement(taskText);
        todoInput.value = '';
        todoInput.focus();
    }

    function createTaskElement(taskText) {
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.textContent = taskText;
        li.appendChild(span);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '✕';
        removeBtn.classList.add('remove-todo-btn');
        removeBtn.setAttribute('aria-label', `Remove task: ${taskText}`);
        li.appendChild(removeBtn);
        todoList.appendChild(li);
    }

    function removeTask(taskElement) {
        if (taskElement && taskElement.parentNode === todoList) {
            taskElement.remove();
        }
    }

    function toggleTaskComplete(taskElement) {
        if (taskElement) {
            taskElement.classList.toggle('completed');
            const isCompleted = taskElement.classList.contains('completed');
            taskElement.setAttribute('aria-checked', isCompleted);
        }
    }


    // --- NEW: Interactive Image Carousel (Step 2) ---
    const carouselTrack = document.getElementById('carouselTrack');
    const prevButton = document.getElementById('carouselPrevBtn');
    const nextButton = document.getElementById('carouselNextBtn');

    if (carouselTrack && prevButton && nextButton) {
        const slides = Array.from(carouselTrack.children);
        const slideCount = slides.length;
        let currentIndex = 0;
        let slideWidth = 0; // Will be calculated

        function calculateSlideWidth() {
            if (slides.length > 0) {
                // Get the width of the first slide, assuming all are the same
                // This includes padding and border, but not margin.
                // Add margin if your cards have horizontal margin affecting layout.
                const firstSlideStyle = window.getComputedStyle(slides[0]);
                slideWidth = slides[0].offsetWidth + parseInt(firstSlideStyle.marginLeft) + parseInt(firstSlideStyle.marginRight);
            }
        }

        function updateCarousel() {
            if (slideWidth === 0) calculateSlideWidth(); // Calculate if not already done
            if (slideWidth === 0 && slides.length > 0) { // Fallback if offsetWidth is 0 (e.g. display:none)
                console.warn("Carousel slide width could not be determined. Ensure items are visible on load.");
                return;
            }

            const newTransformValue = -currentIndex * slideWidth;
            carouselTrack.style.transform = `translateX(${newTransformValue}px)`;

            // Update button states
            prevButton.disabled = currentIndex === 0;
            nextButton.disabled = currentIndex >= slideCount - 1; // Or however many slides you show at once
                                                                // For a "show one at a time" setup, it's slideCount - 1
        }

        nextButton.addEventListener('click', () => {
            if (currentIndex < slideCount - 1) {
                currentIndex++;
                updateCarousel();
            }
        });

        prevButton.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        });

        // Initial setup
        if (slideCount > 0) {
            calculateSlideWidth(); // Calculate initial width
            updateCarousel();     // Set initial position and button states
        } else {
            // No slides, hide buttons or show a message
            prevButton.style.display = 'none';
            nextButton.style.display = 'none';
        }

        // Optional: Recalculate on window resize if your layout is very fluid
        // This can be performance intensive if not debounced/throttled
        window.addEventListener('resize', () => {
            if (slideCount > 0) {
                calculateSlideWidth(); // Recalculate width
                updateCarousel();     // Re-apply transform and button states
            }
        });

    } else {
        console.warn("Carousel elements not found. Ensure #carouselTrack, #carouselPrevBtn, and #carouselNextBtn exist.");
    }


    // --- NEW: Fetch Data from an API (Step 3) ---
    const fetchJokeBtn = document.getElementById('fetchJokeBtn');
    const jokeContainer = document.getElementById('jokeContainer');

    if (fetchJokeBtn && jokeContainer) {
        fetchJokeBtn.addEventListener('click', fetchJoke);
    }

    async function fetchJoke() {
        if (!jokeContainer) return;
        jokeContainer.innerHTML = '<p>Loading joke...</p>'; // Provide user feedback

        try {
            // Using JokeAPI: Fetches a random single-part joke, avoiding certain categories
            const response = await fetch('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist,sexist,explicit&type=single');

            if (!response.ok) {
                // If the HTTP response status is not 2xx, throw an error
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                // JokeAPI specific error handling
                jokeContainer.innerHTML = `<p>Sorry, couldn't fetch a joke: ${data.message || 'Unknown API error'}</p>`;
            } else if (data.joke) {
                // Display the single-part joke
                jokeContainer.innerHTML = `<p>${data.joke}</p>`;
            } else {
                // Fallback if the structure is unexpected (e.g., a two-part joke was somehow returned)
                jokeContainer.innerHTML = '<p>Sorry, the joke format was unexpected. Please try again.</p>';
            }

        } catch (error) {
            // Catch network errors or errors thrown from the try block
            console.error("Error fetching joke:", error);
            jokeContainer.innerHTML = `<p>Oops! Something went wrong while fetching the joke. Please check your connection and try again.</p><p><small>Details: ${error.message}</small></p>`;
        }
    }

    // Optional: Fetch an initial joke on page load
    if (jokeContainer && fetchJokeBtn) { // Ensure elements exist
         // fetchJoke(); // Uncomment this line if you want a joke to load automatically
    }

}); // End of DOMContentLoaded
