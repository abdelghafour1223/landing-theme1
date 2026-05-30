function initUpsellOnCart() {
        const parser = new DOMParser();

        const formIdList = [
          "cart-upsell-form-1",
          "cart-upsell-form-2",
          "cart-upsell-form-3",
          "cart-upsell-form-4",
          "cart-upsell-form-5",
        ];

        formIdList.forEach((_formId) => {
          const form = document.getElementById(_formId);
          if (form) {
              // Setup variant selection
              const selects = form.querySelectorAll('select[name^="options["]');
              const hiddenIdInput = form.querySelector('input[name="id"]');
              const productJson = JSON.parse(form.querySelector("#upsell-product-json").text);

              const updateVariantId = () => {
                  let selectedOptions = [];
                  selects.forEach(select => {
                    selectedOptions.push(select.value);
                  });
                  
                  if (productJson.variants) {
                  const selectedVariant = productJson.variants.find(variant => {
                      return selectedOptions.every((option, index) => {
                      return variant.options[index] === option;
                      });
                  });

                  if (selectedVariant) {
                      hiddenIdInput.value = selectedVariant.id;
                      // Update button text with new variant price
                      const buttonTextElement = form.querySelector('.upsell-button-text');
                      if (buttonTextElement && selectedVariant.price) {
                      // Use Shopify's money format for the current market/currency
                      const currentCurrency = '';
                      
                      // Convert price from cents to currency units
                      const price = selectedVariant.price / 100;
                      
                      // Format based on current currency
                      let formattedPrice;
                      if (currentCurrency === 'USD') {
                          // US format: $9.95
                          formattedPrice = '$' + price.toFixed(2);
                      } else if (currentCurrency === 'EUR') {
                          // European format: €9,95
                          formattedPrice = '€' + price.toFixed(2).replace('.', ',');
                      } else if (currentCurrency === 'GBP') {
                          // British format: £9.95
                          formattedPrice = '£' + price.toFixed(2);
                      } else if (currentCurrency === 'CAD') {
                          // Canadian format: $9.95 CAD
                          formattedPrice = '$' + price.toFixed(2) + ' CAD';
                      } else {
                          // Generic fallback: CURRENCY 9.95
                          formattedPrice = currentCurrency + ' ' + price.toFixed(2);
                      }
                      
                      // Wrap price in span with price color
                      buttonTextElement.innerHTML = '+<span class="upsell-price" style="color: #FFFFFF">' + formattedPrice + '</span>';
                      }
                  }
                  }
              };

              selects.forEach(select => {
                  select.addEventListener('change', updateVariantId);
              });
              
              // Initialize
              if (selects.length > 0) {
                  updateVariantId();
              }
          }
        });

        const cartDrawerContainer = document.querySelector("cart-drawer");
        const submitButtonList = document.querySelectorAll(
          '.upsell-product-container button[name="upsell-add"]'
        );

        submitButtonList.forEach((submitButton) => {
          submitButton.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            const form = submitButton.closest(".upsell-form");

            const addButton = form.querySelector(`.upsell-add-button`);
            const originalButtonText = addButton.querySelector(
              ".upsell-button-text"
            ).textContent;

            // Show loading state - replace text with spinner
            addButton.innerHTML = '<span class="button-spinner"></span>';
            addButton.classList.add("is-loading");
            addButton.disabled = true;

            // Get the variant ID
            const hiddenIdInput = form.querySelector('input[name="id"]');
            const variantId = hiddenIdInput.value;

            try {
              // طلب الآن (التوصيل فابور) using fetch API
              fetch(`${window.routes.cart_add_url}.js`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({
                  items: [
                    {
                      id: variantId,
                      quantity: 1,
                    },
                  ],
                }),
              })
                .then((response) => {
                  if (!response.ok) {
                    return response.json().then((errorData) => {
                      throw new Error(
                        `Error ${response.status}: ${
                          errorData.description || response.statusText
                        }`
                      );
                    });
                  }
                  return response.json();
                })
                .then((data) => {
                  // Success - restore button content properly
                  const successText = null;

                  addButton.innerHTML =
                    '<span class="upsell-button-text">' +
                    (successText ?? originalButtonText) +
                    "</span>";
                  addButton.classList.remove("is-loading");
                  addButton.classList.add("upsell-add-success");

                  setTimeout(() => {
                    addButton.innerHTML = '<span class="upsell-button-text">' +
                    originalButtonText +
                    "</span>";
                  }, 2000);

                  // Update cart count and drawer (existing logic here)
                  if (typeof window.updateCartCount === "function") {
                    window.updateCartCount();
                  }
                  if (typeof window.refreshCart === "function") {
                    window.refreshCart();
                  }
                  document.dispatchEvent(new CustomEvent("cart:refresh"));
                  document.dispatchEvent(new CustomEvent("cart:update"));
                  if (
                    typeof window.THEME !== "undefined" &&
                    window.THEME.updateCartCount
                  ) {
                    window.THEME.updateCartCount();
                  } else if (typeof window.refreshMiniCart === "function") {
                    window.refreshMiniCart();
                  }

                  fetch(routes.cart_url + "?view=drawer")
                    .then((response) => response.text())
                    .then((html) => {
                      const parsedCartHtml = parser.parseFromString(
                        html,
                        "text/html"
                      );
                      const newCartDrawer =
                        parsedCartHtml.querySelector("#CartDrawer");
                      if (cartDrawerContainer && newCartDrawer) {
                        updateCartDrawer(cartDrawerContainer, newCartDrawer);
                      }
                    });

                  // Reset button after 2 seconds
                  setTimeout(() => {
                    addButton.disabled = false;
                    addButton.classList.remove("upsell-add-success");
                  }, 2000);
                })
                .catch((error) => {
                  console.error("طلب الآن (التوصيل فابور) error:", error);
                  addButton.innerHTML =
                    '<span class="upsell-button-text">' +
                    originalButtonText +
                    "</span>";
                  addButton.classList.remove("is-loading");
                  addButton.classList.add("upsell-add-error");

                  // Reset button after 2 seconds
                  setTimeout(() => {
                    addButton.disabled = false;
                    addButton.classList.remove("upsell-add-error");
                  }, 2000);
                });
            } catch (err) {
              console.error("Synchronous error in form submission:", err);
              addButton.innerHTML =
                '<span class="upsell-button-text">' + originalButtonText + "</span>";
              addButton.classList.remove("is-loading");
              addButton.disabled = false;
            }

            return false; // Explicitly return false to be absolutely sure
          });
        });

        const sliderContainer = document.querySelector('.upsell_slider');
        if (!sliderContainer) return;

        const slider = sliderContainer.querySelector('.upsell_block_container');
        const dotsContainer = sliderContainer.querySelector('.dots-and-arrows');
        const dots = dotsContainer.querySelectorAll('.slide_item');
        const prevArrow = dotsContainer.querySelector('#slide-arrow-prev');
        const nextArrow = dotsContainer.querySelector('#slide-arrow-next');
        
        if (!slider || !dotsContainer || !prevArrow || !nextArrow) return;

        let slideWidth = 0;

        const calculateSlideWidth = () => {
          const firstSlide = slider.querySelector('.upsell-product-container');
          if (firstSlide) {
            slideWidth = firstSlide.offsetWidth;
          }
        };

        const updateDots = () => {
          calculateSlideWidth();
          if (slideWidth === 0) return;

          const activeIndex = Math.round(slider.scrollLeft / slideWidth);
          dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === activeIndex);
          });
        };

        // Use Intersection Observer to run logic only when cart is visible
        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            calculateSlideWidth();
            updateDots();
          }
        }, { threshold: 0.1 });

        const cartDrawer = document.querySelector('cart-drawer');
        if (cartDrawer) {
          observer.observe(cartDrawer);
        }

        slider.addEventListener('scroll', updateDots);
        window.addEventListener('resize', updateDots);

        dots.forEach((dot, index) => {
          dot.addEventListener('click', () => {
            if (slideWidth === 0) calculateSlideWidth();
            slider.scrollTo({
              left: index * slideWidth,
              behavior: 'smooth'
            });
          });
        });

        prevArrow.addEventListener('click', () => {
          if (slideWidth === 0) calculateSlideWidth();
          slider.scrollBy({ left: -slideWidth, behavior: 'smooth' });
        });

        nextArrow.addEventListener('click', () => {
          if (slideWidth === 0) calculateSlideWidth();
          slider.scrollBy({ left: slideWidth, behavior: 'smooth' });
        });

        const slideItems = document.querySelectorAll(".slide_item");
        // Optional function to update active dot styling
        function updateActiveDot(activeSlide) {
          slideItems.forEach((item) => {
            if (parseInt(item.getAttribute("data-slide")) === activeSlide) {
              item.classList.add("active");
            } else {
              item.classList.remove("active");
            }
          });
        }

        // Select the slider container
        const upsellContainer = document.querySelector(".upsell_block_container");
        if (!upsellContainer) return;
        // Add click event to each dot
        slideItems.forEach((item) => {
          item.addEventListener("click", function () {
            const slideIndex = parseInt(this.getAttribute("data-slide")) - 1;
            // Calculate scroll position
            const scrollPosition = slideIndex * slideWidth;
            // Smooth scroll to the selected slide
            sliderContainer.scrollTo({
              left: scrollPosition,
              behavior: "smooth",
            });
            // Optional: Update active dot styling
            updateActiveDot(slideIndex + 1); // Convert back to 1-based for data-slide
          });
        });
      }

 
  function detectDiscountWrap() {
    const container = document.querySelector('.cart-drawer .discount_price-container');
    const discount = container?.querySelector('.discount_discount-value');
    const price = container?.querySelector('.totals__total-value');

    if (!container || !discount || !price) return;
    const discountTop = discount.getBoundingClientRect().top;
    const priceTop = price.getBoundingClientRect().top;
    console.log(discountTop, priceTop);
    if (discountTop + 5 < priceTop) {
      container.classList.add('wrap');
    } else {
      container.classList.remove('wrap');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initUpsellOnCart();
    detectDiscountWrap();
  });

window.enableAutoplay = null;

// Make translations available to JS
        window.variantStrings = window.variantStrings || {};
        window.variantStrings.addToCart = "طلب الآن (التوصيل فابور)";
        window.variantStrings.soldOut = "Sold out";
        window.variantStrings.adding = "Translation missing: en.sections.add_to_cart.adding_text";
        window.variantStrings.added = "Translation missing: en.sections.add_to_cart.added_text";

        var addToCartButtonText = "طلب الآن (التوصيل فابور)"
        var showPriceButton = false

var parser = new DOMParser();
  var originPrice = '450 درهم';
  const currency = window.Shopify?.currency?.active ?? 'USD';

  const formId = 'product-form-template--28684899876945__main';
  const form = document.getElementById(formId);

  function formatMoney(newMoney) {
    const originPriceNumber = originPrice.replace(/[^0-9.,]/g, '');
    return `${originPrice.replace(originPriceNumber, newMoney)} ${currency}`;
  }
  function formatMoneyWithoutSuffix(newMoney) {
    const originPriceNumber = originPrice.replace(/[^0-9.,]/g, '');
    return `${originPrice.replace(originPriceNumber, newMoney)}`;
  }

  const quantityElems = form.querySelectorAll('input[type="hidden"][name="quantity"]');
  const addQuantityElem = (quantityVal) => {
    const curForm = document.getElementById(formId);
    const quantityElem = document.createElement('input');
    quantityElem.setAttribute('type', 'hidden');
    quantityElem.setAttribute('name', 'quantity');
    quantityElem.setAttribute('value', quantityVal);
    curForm.appendChild(quantityElem);
  };

document.addEventListener('DOMContentLoaded', function() {
    (function() {
      // Initialize slider functionality for section template--28684899876945__before_after_comparison_dg6PAy
      let sliderPosition = 50; // Start position from settings
      let isDragging = false;
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;
      let hasMovedHorizontally = false;
      let isScrolling = null;
      
      // Get DOM elements
      const container = document.getElementById('sliderContainertemplate--28684899876945__before_after_comparison_dg6PAy');
      const beforeImage = document.getElementById('beforeImagetemplate--28684899876945__before_after_comparison_dg6PAy');
      const sliderLine = document.getElementById('sliderLinetemplate--28684899876945__before_after_comparison_dg6PAy');
      const sliderButton = document.getElementById('sliderButtontemplate--28684899876945__before_after_comparison_dg6PAy');
      
      if (!container || !beforeImage || !sliderLine || !sliderButton) return;
      
      // Update slider position
      function updateSliderPosition(percentage) {
        // Clamp percentage between 0 and 100
        percentage = Math.max(0, Math.min(100, percentage));
        sliderPosition = percentage;
        
        // Update elements
        beforeImage.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
        sliderLine.style.left = percentage + '%';
        sliderButton.style.left = percentage + '%';
        
        // Force reflow to ensure immediate update
        sliderButton.offsetLeft;
        sliderLine.offsetLeft;
      }
      
      // Get mouse/touch position relative to container
      function getPositionFromEvent(e, container) {
        const rect = container.getBoundingClientRect();
        const clientX = e.type && e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const offsetX = clientX - rect.left;
        return Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
      }
      
      // Reset touch state
      function resetTouchState() {
        isDragging = false;
        touchStartX = 0;
        touchStartY = 0;
        touchStartTime = 0;
        hasMovedHorizontally = false;
        isScrolling = null;
        sliderButton.classList.remove('dragging');
        sliderButton.style.transition = '';
      }
      
      // Mouse events
      function handleMouseDown(e) {
        e.preventDefault();
        isDragging = true;
        sliderButton.classList.add('dragging');
        sliderButton.style.transition = 'none';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
      
      function handleMouseMove(e) {
        if (!isDragging) return;
        const percentage = getPositionFromEvent(e, container);
        updateSliderPosition(percentage);
      }
      
      function handleMouseUp() {
        isDragging = false;
        sliderButton.classList.remove('dragging');
        sliderButton.style.transition = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
      
      // Touch events - completely rewritten for better mobile experience
      function handleTouchStart(e) {
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        
        // Check if touch is within container bounds
        if (touchX < 0 || touchX > rect.width || touchY < 0 || touchY > rect.height) {
          return;
        }
        
        // Reset state
        resetTouchState();
        
        // Set initial touch values
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
        isDragging = true;
        isScrolling = null;
        hasMovedHorizontally = false;
        
        sliderButton.classList.add('dragging');
        sliderButton.style.transition = 'none';
        
        // Add touch event listeners
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        document.addEventListener('touchcancel', handleTouchCancel, { passive: true });
      }
      
      function handleTouchMove(e) {
        if (!isDragging) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        // Determine scroll direction on first significant movement
        if (isScrolling === null && (absDeltaX > 5 || absDeltaY > 5)) {
          isScrolling = absDeltaY > absDeltaX;
        }
        
        // If user is scrolling vertically, cancel slider interaction
        if (isScrolling) {
          resetTouchState();
          document.removeEventListener('touchmove', handleTouchMove);
          document.removeEventListener('touchend', handleTouchEnd);
          document.removeEventListener('touchcancel', handleTouchCancel);
          return;
        }
        
        // If moving horizontally, prevent default scrolling and update slider
        if (absDeltaX > 5) {
          e.preventDefault();
          hasMovedHorizontally = true;
          const percentage = getPositionFromEvent(e, container);
          updateSliderPosition(percentage);
        }
      }
      
      function handleTouchEnd(e) {
        if (!isDragging) return;
        
        // Clean up event listeners
          document.removeEventListener('touchmove', handleTouchMove);
          document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchCancel);
        
        // If it was a quick tap without horizontal movement, treat as click
        const touchDuration = Date.now() - touchStartTime;
        if (touchDuration < 200 && !hasMovedHorizontally && !isScrolling) {
          const percentage = getPositionFromEvent(e.changedTouches[0], container);
          updateSliderPosition(percentage);
        }
        
        resetTouchState();
      }
      
      function handleTouchCancel() {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchCancel);
        resetTouchState();
      }
      
      // Container click/tap events
      function handleContainerClick(e) {
        // Don't handle if clicking on slider button
        if (e.target === sliderButton || sliderButton.contains(e.target)) return;
        
        // Don't handle if this was part of a drag gesture
        if (hasMovedHorizontally) return;
        
        const percentage = getPositionFromEvent(e, container);
        updateSliderPosition(percentage);
      }
      
      // Attach event listeners
      sliderButton.addEventListener('mousedown', handleMouseDown);
      sliderButton.addEventListener('touchstart', handleTouchStart, { passive: true });
      
      container.addEventListener('mousedown', function(e) {
        if (e.target === sliderButton || sliderButton.contains(e.target)) return;
        handleMouseDown(e);
      });
      
      container.addEventListener('touchstart', function(e) {
        if (e.target === sliderButton || sliderButton.contains(e.target)) return;
        handleTouchStart(e);
      }, { passive: true });
      
      container.addEventListener('click', handleContainerClick);
      
      // Initialize position
      updateSliderPosition(50);
    })();
  });

// Init function for scroll to first section functionality (Image with Text buttons)
  function initImageTextScrollToFirst() {
    try {
      // Handle scroll-to-first-section functionality for image with text buttons
      const scrollToFirstButtons = document.querySelectorAll('.image-text-scroll-to-first[data-scroll-to-first-section]');
      console.log('🎯 Image with Text: Found ' + scrollToFirstButtons.length + ' scroll-to-first buttons');
      
      scrollToFirstButtons.forEach(button => {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          
          console.log('🎯 Image with Text: Scrolling to first section...');
          
          // Find the first section on the page (excluding header/navigation)
          const selectors = [
            // Most common first section patterns
            'main section:first-of-type',
            '.main-content section:first-of-type',
            '.page-content section:first-of-type',
            
            // Shopify section patterns
            '.shopify-section:not([data-section-type="header"]):not([data-section-type="announcement-bar"])',
            'section.shopify-section:not([data-section-type="header"])',
            
            // General section patterns
            'main > *:first-child',
            '.content section:first-of-type',
            'section:not(header):not([role="banner"])',
            
            // Fallback to any section
            'section:first-of-type',
            '[data-section-type]:not([data-section-type="header"])',
            
            // Last resort - any content element
            'main > div:first-child',
            '.main > *:first-child'
          ];
          
          let targetElement = null;
          let usedSelector = '';
          
          for (const selector of selectors) {
            try {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                targetElement = elements[0];
                usedSelector = selector;
                console.log(`✅ Found target using selector: ${usedSelector}`, targetElement);
                break;
              }
            } catch (error) {
              console.warn(`❌ Invalid selector: ${selector}`, error);
            }
          }
          
          if (targetElement) {
            // Calculate offset for fixed headers
            const headerHeight = document.querySelector('header')?.offsetHeight || 0;
            const stickyHeader = document.querySelector('.sticky-header, .header-sticky, [style*="position: fixed"]')?.offsetHeight || 0;
            const adminBarHeight = document.querySelector('#admin_bar_iframe, .admin-bar')?.offsetHeight || 0;
            const announcementBar = document.querySelector('.announcement-bar, .promo-bar')?.offsetHeight || 0;
            
            const offset = Math.max(headerHeight, stickyHeader) + adminBarHeight + announcementBar + 20;
            
            const elementPosition = targetElement.offsetTop;
            const offsetPosition = elementPosition - offset;
            
            window.scrollTo({
              top: Math.max(0, offsetPosition),
              behavior: 'smooth'
            });
            
            console.log(`✅ Image with Text: Scrolled to first section using selector: ${usedSelector}`);
            
            // Optional: Add visual highlight to show successful targeting
            targetElement.style.transition = 'all 0.3s ease';
            targetElement.style.transform = 'scale(1.01)';
            setTimeout(() => {
              targetElement.style.transform = 'scale(1)';
            }, 300);
            
          } else {
            console.warn('⚠️ Image with Text: No first section found, falling back to scroll to top');
            // Fallback: scroll to top if no target found
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
          }
        });
      });
    } catch (error) {
      console.error('❌ Error initializing image with text scroll to first:', error);
    }
  }

  // Init function for scroll to product functionality
  function initScrollToProduct() {
    try {
      // Handle smooth scrolling for product links
      const scrollButtons = document.querySelectorAll('.js-scroll-to-products, [data-scroll-to-product="true"]');
      console.log('Found ' + scrollButtons.length + ' product scroll buttons');
      
      if (scrollButtons.length === 0) return;
      
      scrollButtons.forEach(button => {
        button.addEventListener('click', function(e) {
          try {
            console.log('Button clicked: ', this);
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            console.log('Target ID: ', targetId);
            let targetElement = document.querySelector(targetId);
            console.log('Initial target element found: ', targetElement);
            
            if (targetElement) {
              // Scroll to the target element with smooth behavior
              console.log('Scrolling to specific target: ', targetElement);
              targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              });
            } else {
              // Try various common product section selectors if the specific ID wasn't found
              const productSelectors = [
                // Main product selectors
                '#MainProduct',
                '#shopify-section-product-template',
                '#shopify-section-product',
                '#product-section',
                '.product-section',
                // Fallback to any product-related elements
                '.product-template',
                '.product-container',
                '.product-main',
                '.product',
                '[data-section-type="product"]',
                '[data-section-id*="product"]'
              ];
              
              console.log('Trying fallback selectors: ', productSelectors);
              
              // Try each selector until we find a match
              for (const selector of productSelectors) {
                targetElement = document.querySelector(selector);
                if (targetElement) {
                  console.log('Found product element with selector: ', selector);
                  targetElement.scrollIntoView({
                    behavior: 'smooth', 
                    block: 'start'
                  });
                  return; // Exit once we've found and scrolled to a product element
                }
              }
              
              console.log('No product selectors found, trying main content');
              
              // Final fallback: if no product section is found, try scrolling to the main content area
              targetElement = document.querySelector('main') || document.querySelector('#MainContent');
              if (targetElement) {
                console.log('Scrolling to main content: ', targetElement);
                targetElement.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start'
                });
              } else {
                console.log('No scrollable element found');
              }
            }
          } catch (err) {
            console.error('Error in scroll button click handler:', err);
          }
        });
      });
    } catch (err) {
      console.error('Error initializing scroll to product functionality:', err);
    }
  }

  // Enhanced Accordion functionality with debugging
  function initAccordions() {
    console.log('Initializing accordions...');
    const accordionContainers = document.querySelectorAll('#image-text-section-template--28684899876945__image_with_text_9Vm4Bn .accordion-items-wrapper');
    console.log('Found', accordionContainers.length, 'accordion containers');
    
    if (accordionContainers.length === 0) {
      console.log('No accordion containers found');
      return;
    }
    
    accordionContainers.forEach((container, containerIndex) => {
      console.log(`Processing container ${containerIndex + 1}`);
      const accordionItems = container.querySelectorAll('.accordion-item');
      const accordionMode = container.getAttribute('data-accordion-mode') === 'true';
      console.log(`Container ${containerIndex + 1} has ${accordionItems.length} items, accordion mode: ${accordionMode}`);
      
      accordionItems.forEach((item, itemIndex) => {
        const header = item.querySelector('.accordion-header');
        const content = item.querySelector('.accordion-content');
        
        if (!header) {
          console.log(`No header found for item ${itemIndex + 1}`);
          return;
        }
        
        if (!content) {
          console.log(`No content found for item ${itemIndex + 1}`);
          return;
        }
        
        // Skip if already initialized
        if (header.hasAttribute('data-accordion-initialized')) {
          console.log(`Item ${itemIndex + 1} already initialized, skipping`);
          return;
        }
        
        console.log(`Setting up click handler for item ${itemIndex + 1}`);
        
        // Create the click handler function
        const clickHandler = function(e) {
          console.log(`Accordion item ${itemIndex + 1} clicked!`);
          e.preventDefault();
          e.stopPropagation();
          
          const isActive = item.classList.contains('active');
          console.log(`Item ${itemIndex + 1} is currently ${isActive ? 'active' : 'inactive'}`);
          
          // If in accordion mode, close all other items
          if (accordionMode && !isActive) {
            console.log('Accordion mode: closing other items');
            accordionItems.forEach((otherItem, otherIndex) => {
              if (otherItem !== item && otherItem.classList.contains('active')) {
                console.log(`Closing item ${otherIndex + 1}`);
                otherItem.classList.remove('active');
              }
            });
          }
          
          // Toggle the current item
          if (isActive) {
            console.log(`Closing item ${itemIndex + 1}`);
            item.classList.remove('active');
          } else {
            console.log(`Opening item ${itemIndex + 1}`);
            item.classList.add('active');
          }
          
          // Trigger custom event for tracking/analytics
          try {
            container.dispatchEvent(new CustomEvent('accordion:toggle', {
              detail: {
                item: item,
                isOpen: !isActive,
                text: header.querySelector('.accordion-header-text')?.textContent
              }
            }));
          } catch (err) {
            console.error('Error dispatching accordion event:', err);
          }
        };
        
        // Add the click listener
        header.addEventListener('click', clickHandler);
        
        // Store the handler reference for potential cleanup
        header._accordionClickHandler = clickHandler;
        
        // Mark as initialized
        header.setAttribute('data-accordion-initialized', 'true');
        
        // Add visual feedback on hover
        header.style.cursor = 'pointer';
        
        // Add keyboard support
        const keyHandler = function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            console.log(`Keyboard trigger for item ${itemIndex + 1}`);
            e.preventDefault();
            clickHandler(e);
          }
        };
        
        header.addEventListener('keydown', keyHandler);
        header._accordionKeyHandler = keyHandler;
        
        // Make header focusable for accessibility
        if (!header.hasAttribute('tabindex')) {
          header.setAttribute('tabindex', '0');
        }
        
        console.log(`Item ${itemIndex + 1} setup complete`);
      });
    });
    
    console.log('Accordion initialization complete');
  }

  // Function to manually test accordion (for debugging)
  function testAccordion() {
    console.log('Testing accordion functionality...');
    const firstItem = document.querySelector('#image-text-section-template--28684899876945__image_with_text_9Vm4Bn .accordion-item');
    if (firstItem) {
      console.log('Found first accordion item, toggling...');
      firstItem.classList.toggle('active');
      console.log('First item is now:', firstItem.classList.contains('active') ? 'active' : 'inactive');
      return true;
    } else {
      console.log('No accordion items found for testing');
      return false;
    }
  }

  // Initialize immediately if DOM is already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      console.log('DOM Content Loaded - initializing components');
      initImageTextScrollToFirst();
      initScrollToProduct();
      initAccordions();
    });
  } else {
    // DOM is already ready
    console.log('DOM already ready - initializing components immediately');
    initImageTextScrollToFirst();
    initScrollToProduct();
    initAccordions();
  }
  
  // Also run on window load to ensure all elements are fully loaded
  window.addEventListener('load', function() {
    console.log('Window loaded - re-initializing components');
    initImageTextScrollToFirst();
    initScrollToProduct();
    initAccordions();
  });
  
  // Additional initialization for dynamic content
  document.addEventListener('shopify:section:load', function() {
    console.log('Shopify section loaded - initializing components');
    initImageTextScrollToFirst();
    initScrollToProduct();
    initAccordions();
  });

  // Backup initialization using setTimeout
  setTimeout(function() {
    console.log('Backup initialization running...');
    if (document.querySelector('#image-text-section-template--28684899876945__image_with_text_9Vm4Bn .accordion-items-wrapper') && !document.querySelector('#image-text-section-template--28684899876945__image_with_text_9Vm4Bn .accordion-header[data-accordion-initialized]')) {
      console.log('Found uninitialized accordions, running backup init');
      initAccordions();
    }
  }, 2000);

  // Make functions globally available for debugging
  window.debugAccordion = {
    init: initAccordions,
    test: testAccordion,
    toggle: function(index) {
      const items = document.querySelectorAll('#image-text-section-template--28684899876945__image_with_text_9Vm4Bn .accordion-item');
      if (items[index]) {
        items[index].classList.toggle('active');
        console.log(`Manually toggled item ${index + 1}`);
      }
    }
  };

  // Final fallback: try to initialize immediately
  try {
    console.log('Immediate initialization attempt...');
    initImageTextScrollToFirst();
    initScrollToProduct();
    initAccordions();
  } catch (err) {
    console.error('Immediate initialization failed:', err);
  }

document.addEventListener('DOMContentLoaded', function() {
  const stepsSection = document.querySelector('.section-template--28684899876945__steps_NPBhYa.results-steps-section');
  if (!stepsSection) return;

  // Get both desktop and mobile containers
  const desktopContainer = stepsSection.querySelector('.steps-container-desktop .steps-container');
  const mobileContainer = stepsSection.querySelector('.steps-container-mobile .steps-container');
  
  // Determine which container to use based on screen size and carousel settings
  function getActiveContainer() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile && mobileContainer) {
      return mobileContainer;
    } else if (!isMobile && desktopContainer) {
      return desktopContainer;
    }
    return null;
  }
  
  // Initialize carousel for both containers
  function initializeCarousel(container) {
    if (!container || (!container.classList.contains('has-carousel-desktop') && !container.classList.contains('has-carousel-mobile'))) return null;

    const track = container.querySelector('.carousel-track');
    const slides = container.querySelectorAll('.carousel-slide');
    const prevBtn = container.closest('.steps-container-desktop, .steps-container-mobile').querySelector('.nav-button.prev');
    const nextBtn = container.closest('.steps-container-desktop, .steps-container-mobile').querySelector('.nav-button.next');

    if (!track || !slides.length || !prevBtn || !nextBtn) return null;

    const hasDesktopCarousel = container.classList.contains('has-carousel-desktop');
    const hasMobileCarousel = container.classList.contains('has-carousel-mobile');
    
    return {
      container,
      track,
      slides,
      prevBtn,
      nextBtn,
      hasDesktopCarousel,
      hasMobileCarousel,
      currentSlide: 0
    };
  }

  // Initialize both carousels
  let desktopCarousel = desktopContainer ? initializeCarousel(desktopContainer) : null;
  let mobileCarousel = mobileContainer ? initializeCarousel(mobileContainer) : null;
  
  // Get the active carousel based on screen size
  function getActiveCarousel() {
    const isMobile = window.innerWidth <= 768;
    return isMobile ? mobileCarousel : desktopCarousel;
  }
  
  function isCarouselActive(carousel) {
    if (!carousel) return false;
    const isMobile = window.innerWidth <= 768;
    return (isMobile && carousel.hasMobileCarousel) || (!isMobile && carousel.hasDesktopCarousel);
  }

  function getSlidesPerView(carousel) {
    if (!carousel) return 1;
    if (window.innerWidth <= 768 && carousel.hasMobileCarousel) {
      return 1; // Mobile carousel: 1 slide at a time
    }
    return Math.min(4, carousel.slides.length); // Desktop: max 4 slides
  }

  function updateCarousel(carousel) {
    if (!carousel || !isCarouselActive(carousel)) {
      return;
    }

    const slidesPerView = getSlidesPerView(carousel);
    const slideWidth = 100 / slidesPerView;
    const maxSlide = carousel.slides.length - slidesPerView;
    
    // Ensure currentSlide is within bounds
    carousel.currentSlide = Math.max(0, Math.min(carousel.currentSlide, maxSlide));
    
    const offset = -(carousel.currentSlide * slideWidth);
    carousel.track.style.transform = `translateX(${offset}%)`;

    // Update button states
    carousel.prevBtn.disabled = carousel.currentSlide === 0;
    carousel.nextBtn.disabled = carousel.currentSlide >= maxSlide;
  }

  function nextSlide() {
    const carousel = getActiveCarousel();
    if (!carousel || !isCarouselActive(carousel)) return;
    
    const slidesPerView = getSlidesPerView(carousel);
    const maxSlide = carousel.slides.length - slidesPerView;
    if (carousel.currentSlide < maxSlide) {
      carousel.currentSlide += (window.innerWidth <= 768 && carousel.hasMobileCarousel) ? 1 : slidesPerView;
      updateCarousel(carousel);
    }
  }

  function prevSlide() {
    const carousel = getActiveCarousel();
    if (!carousel || !isCarouselActive(carousel)) return;
    
    if (carousel.currentSlide > 0) {
      const slidesPerView = getSlidesPerView(carousel);
      carousel.currentSlide -= (window.innerWidth <= 768 && carousel.hasMobileCarousel) ? 1 : slidesPerView;
      updateCarousel(carousel);
    }
  }

  // Setup event listeners for a carousel
  function setupCarouselEvents(carousel) {
    if (!carousel) return;
    
    // Touch/swipe variables for this carousel
    let isDown = false;
    let startX = 0;
    let currentX = 0;
    let initialTransform = 0;
    let isDragging = false;
    const movementThreshold = 10; // Minimum pixels to detect intentional movement
    
    // Get current transform value
    function getCurrentTransform() {
      const slidesPerView = getSlidesPerView(carousel);
      const slideWidth = 100 / slidesPerView;
      return -(carousel.currentSlide * slideWidth);
    }

    // Touch/Mouse event handlers
    function handleStart(e) {
      if (!isCarouselActive(carousel)) return;
      
      // Reset all tracking variables
      isDown = true;
      isDragging = false;
      currentX = 0;
      
      // Get initial position for both X and Y
      startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
      const startY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
      
      // Store initial Y position for vertical scroll detection
      carousel.startY = startY;
      carousel.hasVerticalMovement = false;
      
      initialTransform = getCurrentTransform();
      
      // Add transition temporarily for smooth start
      carousel.track.style.transition = 'none';
      carousel.track.style.cursor = 'grabbing';
    }

    function handleMove(e) {
      if (!isDown || !isCarouselActive(carousel)) return;
      
      // Get current position
      currentX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
      const currentY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
      
      // Calculate movement
      const deltaX = currentX - startX;
      const deltaY = currentY - carousel.startY;
      
      // Determine if this is primarily vertical or horizontal movement
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      // If vertical movement is greater than horizontal, allow default scrolling
      if (absY > absX && absY > movementThreshold) {
        carousel.hasVerticalMovement = true;
        return; // Don't interfere with vertical scrolling
      }
      
      // Only prevent default and handle carousel if horizontal movement is detected
      if (absX > movementThreshold && absX > absY) {
        e.preventDefault();
        isDragging = true;
        
      const movePercent = (deltaX / carousel.track.offsetWidth) * 100;
      
      // Apply transform with movement
      const newTransform = initialTransform + movePercent;
      carousel.track.style.transform = `translateX(${newTransform}%)`;
      }
    }

    function handleEnd(e) {
      if (!isDown || !isCarouselActive(carousel)) return;
      
      // Reset interaction state
      isDown = false;
      carousel.track.style.cursor = 'grab';
      carousel.track.style.transition = 'transform 0.3s ease';
      
      // If there was vertical movement, don't process as carousel interaction
      if (carousel.hasVerticalMovement) {
        updateCarousel(carousel); // Reset to current position
        isDragging = false;
        carousel.hasVerticalMovement = false; // Reset for next interaction
        return;
      }
      
      if (isDragging) {
        // Calculate swipe distance and direction
        const deltaX = currentX - startX;
        const threshold = 50; // Minimum distance for swipe
        
        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0) {
            // Swiped right, go to previous slide
            prevSlide();
          } else {
            // Swiped left, go to next slide
            nextSlide();
          }
        } else {
          // Snap back to current position
          updateCarousel(carousel);
        }
        
        // Prevent click events after drag
        setTimeout(() => {
          isDragging = false;
        }, 100);
      } else {
        // No significant movement, snap back
        updateCarousel(carousel);
      }
      
      // Reset movement tracking for next interaction
      carousel.hasVerticalMovement = false;
    }

    // Prevent click events during drag
    function handleClick(e) {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    // Event listeners for buttons
    carousel.nextBtn.addEventListener('click', nextSlide);
    carousel.prevBtn.addEventListener('click', prevSlide);

    // Touch events for mobile (passive start, dynamic move)
    carousel.track.addEventListener('touchstart', handleStart, { passive: true });
    carousel.track.addEventListener('touchmove', handleMove, { passive: false });
    carousel.track.addEventListener('touchend', handleEnd, { passive: true });

    // Mouse events for desktop (only if not a touch device)
    if (!('ontouchstart' in window)) {
    carousel.track.addEventListener('mousedown', handleStart);
    carousel.track.addEventListener('mousemove', handleMove);
    carousel.track.addEventListener('mouseup', handleEnd);
    carousel.track.addEventListener('mouseleave', handleEnd);
    }

    // Prevent unwanted clicks during drag
    carousel.track.addEventListener('click', handleClick, true);

    // Set initial cursor
    carousel.track.style.cursor = 'grab';
    
    // Initialize this carousel
    updateCarousel(carousel);
  }

  // Setup both carousels
  if (desktopCarousel) {
    setupCarouselEvents(desktopCarousel);
  }
  if (mobileCarousel) {
    setupCarouselEvents(mobileCarousel);
  }

  // Handle resize
  window.addEventListener('resize', function() {
    // Reset both carousels to first slide when switching between desktop/mobile
    if (desktopCarousel) {
      desktopCarousel.currentSlide = 0;
      updateCarousel(desktopCarousel);
    }
    if (mobileCarousel) {
      mobileCarousel.currentSlide = 0;
      updateCarousel(mobileCarousel);
    }
  });
});

(function() {
    if (window.innerWidth < 750) {
      document.documentElement.classList.add('faq-mobile-view');
    }
  })();
