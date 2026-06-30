// Toggle individual curriculum sections
function toggleSection(btn) {
  const section = btn.closest('.curriculum_section');
  const lessons = section.querySelector('.section_lessons');
  const arrow = btn.querySelector('.section_arrow');
  const isOpen = section.classList.contains('open');

  if (isOpen) {
    lessons.style.display = 'none';
    section.classList.remove('open');
    arrow.setAttribute('name', 'chevron-down-outline');
  } else {
    lessons.style.display = 'block';
    section.classList.add('open');
    arrow.setAttribute('name', 'chevron-up-outline');
  }
}

// Expand / Collapse all
const expandAllBtn = document.getElementById('expandAll');
let allExpanded = false;

expandAllBtn.addEventListener('click', () => {
  const sections = document.querySelectorAll('.curriculum_section');
  allExpanded = !allExpanded;

  sections.forEach(section => {
    const lessons = section.querySelector('.section_lessons');
    const arrow = section.querySelector('.section_arrow');

    if (allExpanded) {
      lessons.style.display = 'block';
      section.classList.add('open');
      arrow.setAttribute('name', 'chevron-up-outline');
    } else {
      lessons.style.display = 'none';
      section.classList.remove('open');
      arrow.setAttribute('name', 'chevron-down-outline');
    }
  });

  expandAllBtn.textContent = allExpanded ? 'Collapse all' : 'Expand all';
});

// Initialize: open first section by default
document.addEventListener('DOMContentLoaded', () => {
  const firstSection = document.querySelector('.curriculum_section.open');
  if (firstSection) {
    const lessons = firstSection.querySelector('.section_lessons');
    if (lessons) lessons.style.display = 'block';
  }
});
