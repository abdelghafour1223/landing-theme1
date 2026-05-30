document.addEventListener('DOMContentLoaded', function() {
  const guaranteeButtons = document.querySelectorAll('.guarantee-section__cta[data-scroll-to-first-section]');
  
  guaranteeButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector('#offer-bundle-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});