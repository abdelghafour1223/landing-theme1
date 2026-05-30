document.addEventListener('DOMContentLoaded', function () {
  const orderForm = document.getElementById('orderForm');
  const orderQtyInput = document.getElementById('orderQty');
  const orderPriceInput = document.getElementById('orderPrice');
  const fullNameInput = document.getElementById('fullName');
  const fullAddressInput = document.getElementById('fullAddress');
  const phoneNumberInput = document.getElementById('phoneNumber');
  const stickyBar = document.getElementById('stickyBottomBar');
  const stickyCTAButton = document.getElementById('stickyCTAButton');
  const offerSection = document.querySelector('.offer-bundle-inline');

  // Modal overlays
  const orderModal = document.getElementById('orderModal');
  const upsellModal = document.getElementById('upsellModal');

  // Sync initial preselected offer values if inputs exist
  if (orderQtyInput && !orderQtyInput.value) {
    orderQtyInput.value = '2';
  }
  if (orderPriceInput && !orderPriceInput.value) {
    orderPriceInput.value = '329';
  }

  // Click listener for sticky CTA button to scroll to inline offers
  if (stickyCTAButton && offerSection) {
    stickyCTAButton.addEventListener('click', function (e) {
      e.preventDefault();
      offerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function () {
        if (fullNameInput) fullNameInput.focus();
      }, 800);
    });
  }

  // If there are any other offer card buttons on the page, make them scroll to the inline form
  document.querySelectorAll('.offer-card-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (offerSection) {
        offerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(function () {
          if (fullNameInput) fullNameInput.focus();
        }, 800);
      }
    });
  });

  // Validation
  function clearErrors() {
    if (fullNameInput) fullNameInput.classList.remove('error');
    if (fullAddressInput) fullAddressInput.classList.remove('error');
    if (phoneNumberInput) phoneNumberInput.classList.remove('error');
  }

  function validateForm() {
    let isValid = true;
    clearErrors();

    // Name validation: at least 3 characters
    if (fullNameInput) {
      if (!fullNameInput.value.trim() || fullNameInput.value.trim().length < 3) {
        fullNameInput.classList.add('error');
        isValid = false;
      }
    }

    // Address validation: at least 5 characters
    if (fullAddressInput) {
      if (!fullAddressInput.value.trim() || fullAddressInput.value.trim().length < 5) {
        fullAddressInput.classList.add('error');
        isValid = false;
      }
    }

    // Phone validation: Moroccan format (starts with 05,06,07 + 8 digits = 10 total)
    if (phoneNumberInput) {
      const phoneClean = phoneNumberInput.value.replace(/[\s\-()]/g, '');
      const phoneRegex = /^(05|06|07)\d{8}$/;
      if (!phoneRegex.test(phoneClean)) {
        phoneNumberInput.classList.add('error');
        isValid = false;
      }
    }

    return isValid;
  }

  // Real-time phone formatting
  if (phoneNumberInput) {
    phoneNumberInput.addEventListener('input', function () {
      var val = this.value.replace(/[^\d]/g, '');
      if (val.length > 10) {
        val = val.substring(0, 10);
      }
      this.value = val;
    });
  }

  // Remove error on input
  [fullNameInput, fullAddressInput, phoneNumberInput].forEach(function (input) {
    if (input) {
      input.addEventListener('input', function () {
        this.classList.remove('error');
      });
    }
  });

  // Form submission handler using Shopify Cart Permalinks
  if (orderForm) {
    orderForm.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!validateForm()) {
        orderForm.style.animation = 'shake 0.5s ease';
        setTimeout(() => { orderForm.style.animation = ''; }, 500);
        return;
      }

      // Show loading state
      const submitBtn = orderForm.querySelector('.order-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        if (btnText) btnText.style.display = 'none';
        if (btnLoading) btnLoading.style.display = 'inline-block';
      }

      const fullName = fullNameInput.value.trim();
      const fullAddress = fullAddressInput.value.trim();
      const phoneNumber = phoneNumberInput.value.trim();
      
      const cityInput = document.getElementById('city');
      const city = cityInput ? cityInput.value.trim() : 'المغرب';

      const orderQty = orderQtyInput ? orderQtyInput.value : '2';
      const variantInput = document.getElementById('selectedVariantId') || document.querySelector('input[name="id"]');
      const variantId = variantInput ? variantInput.value : '';

      // Check if One-Click Audio Upsell is enabled and configured
      const config = window.ShopifyLandingConfig || {};
      if (config.upsellEnabled && config.upsellVariantId && upsellModal) {
        // Hide order modal and open upsell modal
        if (orderModal) orderModal.classList.remove('active');
        
        // Custom styling to show flex
        upsellModal.style.display = 'flex';
        
        // Autoplay the voice note if it exists
        const upsellAudio = document.getElementById('upsellAudio');
        if (upsellAudio) {
          upsellAudio.play().catch(() => {});
          const upsellPlayIcon = document.getElementById('upsellPlayIcon');
          const upsellPauseIcon = document.getElementById('upsellPauseIcon');
          if (upsellPlayIcon) upsellPlayIcon.style.display = 'none';
          if (upsellPauseIcon) upsellPauseIcon.style.display = 'block';
        }

        // Upsell Yes button listener
        document.getElementById('upsellAcceptBtn').addEventListener('click', function() {
          stopAudio();
          redirectToCheckout(variantId, orderQty, config.upsellVariantId, '1', fullName, phoneNumber, fullAddress, city);
        });

        // Upsell No button listener
        document.getElementById('upsellDeclineBtn').addEventListener('click', function() {
          stopAudio();
          redirectToCheckout(variantId, orderQty, null, null, fullName, phoneNumber, fullAddress, city);
        });

        // Upsell close modal listener
        document.getElementById('upsellModalClose').addEventListener('click', function() {
          stopAudio();
          redirectToCheckout(variantId, orderQty, null, null, fullName, phoneNumber, fullAddress, city);
        });

        function stopAudio() {
          if (upsellAudio) {
            upsellAudio.pause();
          }
        }
      } else {
        // Redirect directly without upsell
        redirectToCheckout(variantId, orderQty, null, null, fullName, phoneNumber, fullAddress, city);
      }
    });
  }

  // Redirect helper using standard Shopify Cart Permalinks
  function redirectToCheckout(variantId, qty, upsellVariantId, upsellQty, name, phone, address, city) {
    let cartItems = `${variantId}:${qty}`;
    if (upsellVariantId && upsellQty) {
      cartItems += `,${upsellVariantId}:${upsellQty}`;
    }

    // Shopify Cart Permalink syntax with secure prefilled shipping fields
    const baseCheckoutUrl = `/cart/${cartItems}`;
    const params = new URLSearchParams({
      'checkout[shipping_address][first_name]': name,
      'checkout[shipping_address][phone]': phone,
      'checkout[shipping_address][address1]': address,
      'checkout[shipping_address][city]': city,
      'checkout[shipping_address][country]': 'Morocco'
    });

    const finalUrl = `${baseCheckoutUrl}?${params.toString()}`;
    window.location.href = finalUrl;
  }

  // Upsell Audio Player Progress & Controls
  const upsellPlayBtn = document.getElementById('upsellPlayBtn');
  const upsellAudio = document.getElementById('upsellAudio');
  const upsellPlayIcon = document.getElementById('upsellPlayIcon');
  const upsellPauseIcon = document.getElementById('upsellPauseIcon');
  const upsellAudioProgress = document.getElementById('upsellAudioProgress');

  if (upsellPlayBtn && upsellAudio) {
    upsellPlayBtn.addEventListener('click', function() {
      if (upsellAudio.paused) {
        upsellAudio.play().catch(() => {});
        upsellPlayIcon.style.display = 'none';
        upsellPauseIcon.style.display = 'block';
      } else {
        upsellAudio.pause();
        upsellPlayIcon.style.display = 'block';
        upsellPauseIcon.style.display = 'none';
      }
    });

    upsellAudio.addEventListener('timeupdate', function() {
      if (upsellAudio.duration) {
        const percentage = (upsellAudio.currentTime / upsellAudio.duration) * 100;
        if (upsellAudioProgress) upsellAudioProgress.style.width = percentage + '%';
      }
    });

    upsellAudio.addEventListener('ended', function() {
      if (upsellPlayIcon) upsellPlayIcon.style.display = 'block';
      if (upsellPauseIcon) upsellPauseIcon.style.display = 'none';
      if (upsellAudioProgress) upsellAudioProgress.style.width = '0%';
    });
  }

  // Sticky Bottom Bar Visibility Controller (Always shows at bottom on mobile, hides only when checkout form is visible)
  if (stickyBar && offerSection) {
    var handleScroll = function () {
      var rect = offerSection.getBoundingClientRect();
      var windowHeight = window.innerHeight || document.documentElement.clientHeight;
      
      var isFormVisible = (rect.top < windowHeight - 50 && rect.bottom > 50);
      
      if (isFormVisible) {
        stickyBar.classList.add('hidden');
      } else {
        stickyBar.classList.remove('hidden');
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
  }
});

// Shake animation definition
(function () {
  var style = document.createElement('style');
  style.textContent = '@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}';
  document.head.appendChild(style);
})();
