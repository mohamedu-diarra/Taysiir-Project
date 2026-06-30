// FAQ Accordion
const faqItems = document.querySelectorAll('.faq_item');

faqItems.forEach(item => {
  const btn = item.querySelector('.faq_question');

  btn.addEventListener('click', () => {
    const isActive = item.classList.contains('active');

    // Close all
    faqItems.forEach(i => {
      i.classList.remove('active');
      i.querySelector('.faq_question').setAttribute('aria-expanded', 'false');
    });

    // Open clicked if it wasn't already open
    if (!isActive) {
      item.classList.add('active');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});
