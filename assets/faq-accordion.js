document.addEventListener("DOMContentLoaded", function () {
  const faqContainer = document.querySelector('.product-faq');
  if (!faqContainer) return;

  const faqItems = faqContainer.querySelectorAll('.faq-item');
  
  faqItems.forEach((item) => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', function () {
      const isActive = item.classList.contains('active');
      
      // Close all other items (accordion mode)
      faqItems.forEach((otherItem) => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
        }
      });

      // Toggle the current item
      item.classList.toggle('active');
    });
  });
});

document.addEventListener('DOMContentLoaded', function() {
    const faqContainer = document.querySelector('#store-faq-template--28684899876945__store_faq_Lpd3PW');
    if (!faqContainer) return;
    
    const faqItems = faqContainer.querySelectorAll('.faq-item');
    const isAccordion = faqContainer.querySelector('.faq-container').getAttribute('data-accordion') === 'true';
    
    // Set initial styles for answers so they get proper padding when activated
    faqItems.forEach(item => {
      const answer = item.querySelector('.faq-answer');
      // Store original padding values to restore when active
      answer.setAttribute('data-padding-active', '0 20px 16px');
      answer.setAttribute('data-padding-mobile-active', '0 12px 10px');
      
      const question = item.querySelector('.faq-question');
      
      // Only add event listener if it doesn't already exist to prevent conflicts
      if (!question.hasAttribute('data-store-faq-listener-bound')) {
        question.setAttribute('data-store-faq-listener-bound', 'true');
        
        question.addEventListener('click', () => {
          const isActive = item.classList.contains('active');
          
          // Close all other items first if accordion mode is enabled
          if (isAccordion && !isActive) {
            faqItems.forEach(otherItem => {
              otherItem.classList.remove('active');
            });
          }
          
          // Toggle the clicked item
          item.classList.toggle('active');
        });
      }
    });
    
    // Handle responsive font sizes
    function updateResponsiveFontSizes() {
      const isMobile = window.innerWidth < 750;
      
      // Apply/remove mobile class at the document level
      if (isMobile) {
        document.documentElement.classList.add('faq-mobile-view');
      } else {
        document.documentElement.classList.remove('faq-mobile-view');
      }
      
      // Apply/remove mobile class for each element
      const questions = faqContainer.querySelectorAll('.faq-question');
      const answers = faqContainer.querySelectorAll('.faq-answer');
      
      questions.forEach(question => {
        if (isMobile) {
          question.classList.add('mobile-font');
        } else {
          question.classList.remove('mobile-font');
        }
      });
      
      answers.forEach(answer => {
        if (isMobile) {
          answer.classList.add('mobile-font');
        } else {
          answer.classList.remove('mobile-font');
        }
      });
    }
    
    // Initial call and add resize listener
    updateResponsiveFontSizes();
    window.addEventListener('resize', updateResponsiveFontSizes);
  });