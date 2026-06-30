/**
 * checkout.js — Ardify Unified Checkout Logic (refactored)
 * Replaces checkout.js, checkout-cyber.js, checkout-uiux.js
 * Depends on: storage.js, app.js
 */

document.addEventListener('DOMContentLoaded', () => {

  // AUTH GUARD
  if (!requireAuth('./login.html')) return;

  // RESOLVE COURSE
  const metaEl   = document.querySelector('meta[name="ardify-course-id"]');
  const courseId = metaEl ? metaEl.getAttribute('content') : null;
  const cart     = ArdifyStorage.getCart();
  if (courseId) {
    const course = ArdifyApp.getCourseById(courseId);
    if (course) ArdifyStorage.setCart(course);
  }
  const activeCourse = courseId ? ArdifyApp.getCourseById(courseId) : (cart || null);

  // PRICING
  function buildDurations(course) {
    if (!course) return {
      '6m': { subtotal: 30, discount: 6,  total: 24, access: '6 Months' },
      '1y': { subtotal: 45, discount: 9,  total: 36, access: '1 Year'   },
    };
    const p6 = course.price6m || 24;
    const p1 = course.price1y || 36;
    const d6 = Math.round(p6 * 0.25 * 100) / 100;
    const d1 = Math.round(p1 * 0.25 * 100) / 100;
    return {
      '6m': { subtotal: +(p6 + d6).toFixed(2), discount: d6, total: p6, access: '6 Months' },
      '1y': { subtotal: +(p1 + d1).toFixed(2), discount: d1, total: p1, access: '1 Year' },
    };
  }

  const durations = buildDurations(activeCourse);

  const summarySubtotal = document.getElementById('summarySubtotal');
  const summaryDiscount = document.getElementById('summaryDiscount');
  const summaryAccess   = document.getElementById('summaryAccess');
  const summaryTotal    = document.getElementById('summaryTotal');
  const payBtnText      = document.getElementById('payBtnText');

  function updateSummary(key) {
    const d = durations[key];
    if (summarySubtotal) summarySubtotal.textContent = '$' + d.subtotal.toFixed(2);
    if (summaryDiscount) summaryDiscount.textContent = '-$' + d.discount.toFixed(2);
    if (summaryAccess)   summaryAccess.textContent   = d.access;
    if (summaryTotal)    summaryTotal.textContent    = '$' + d.total.toFixed(2);
    if (payBtnText)      payBtnText.textContent      = 'Pay $' + d.total.toFixed(2);
  }

  updateSummary('1y');

  document.querySelectorAll('.duration_option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.duration_option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      const radio = opt.querySelector('input[type="radio"]');
      if (radio) { radio.checked = true; updateSummary(radio.value); }
    });
  });

  // PAYMENT METHOD
  const mobileMethods = ['evc', 'zaad', 'sahal', 'ebir'];
  document.querySelectorAll('.payment_option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.payment_option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      const radio = opt.querySelector('input[type="radio"]');
      if (!radio) return;
      radio.checked = true;
      const val = radio.value;
      const mob  = document.getElementById('mobileInputWrap');
      const card = document.getElementById('cardInputsWrap');
      if (mobileMethods.includes(val)) {
        mob  && mob.classList.add('visible');
        card && card.classList.remove('visible');
      } else if (val === 'card') {
        card && card.classList.add('visible');
        mob  && mob.classList.remove('visible');
      } else {
        mob  && mob.classList.remove('visible');
        card && card.classList.remove('visible');
      }
    });
  });

  // CARD FORMAT
  const cardNum = document.getElementById('cardNumber');
  if (cardNum) cardNum.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g,'').substring(0,16);
    e.target.value = v.replace(/(.{4})/g,'$1 ').trim();
  });

  const cardExp = document.getElementById('cardExpiry');
  if (cardExp) cardExp.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g,'').substring(0,4);
    if (v.length >= 2) v = v.slice(0,2) + ' / ' + v.slice(2);
    e.target.value = v;
  });

  // DISCOUNT CODE
  const applyBtn = document.getElementById('applyBtn');
  const discCode = document.getElementById('discountCode');
  if (applyBtn && discCode) {
    applyBtn.addEventListener('click', () => {
      const code = discCode.value.trim().toUpperCase();
      if (code === 'ARDIFY10') {
        discCode.style.borderColor = '#05df72';
        applyBtn.textContent = 'Applied';
        applyBtn.style.color = '#05df72';
        applyBtn.style.borderColor = '#05df72';
      } else if (code !== '') {
        discCode.style.borderColor = '#ef4444';
        applyBtn.textContent = 'Invalid';
        applyBtn.style.color = '#ef4444';
        setTimeout(() => {
          applyBtn.textContent = 'Apply';
          applyBtn.style.color = '';
          applyBtn.style.borderColor = '';
          discCode.style.borderColor = '';
        }, 2000);
      }
    });
  }

  // PAY BUTTON
  const payBtn = document.getElementById('payBtn');
  if (payBtn) {
    payBtn.addEventListener('click', () => {
      if (!document.querySelector('.payment_option.active')) {
        alert('Please select a payment method.');
        return;
      }
      payBtn.innerHTML = '<ion-icon name="checkmark-circle-outline"></ion-icon> Processing...';
      payBtn.disabled = true;
      payBtn.style.backgroundColor = '#2a3447';

      setTimeout(() => {
        const activeOpt = document.querySelector('.duration_option.selected input[type="radio"]');
        const plan = activeOpt ? activeOpt.value : '1y';
        const cid  = activeCourse ? activeCourse.id : (courseId || 'fullstack');
        const ok   = ArdifyApp.completePurchase(cid, plan);

        if (ok) {
          payBtn.innerHTML = '<ion-icon name="checkmark-circle-outline"></ion-icon> Enrolled!';
          payBtn.style.backgroundColor = '#00a63e';
          setTimeout(() => { window.location.href = './student-dashboard.html'; }, 1000);
        } else {
          payBtn.innerHTML = '<ion-icon name="lock-closed-outline"></ion-icon> <span id="payBtnText">Pay</span>';
          payBtn.disabled = false;
          payBtn.style.backgroundColor = '';
          window.location.href = './login.html';
        }
      }, 2000);
    });
  }

  // After successful payment — call this:
if (window.ArdifyEnroll) {
  var courseId = new URLSearchParams(window.location.search).get('courseId') || 'fullstack';
  ArdifyEnroll.enroll(courseId, true); // marks as paid
}
// Then redirect back to the course detail page
window.location.href = './course-detail.html?play=1&courseId=fullstack';

});
