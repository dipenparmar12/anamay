/* Donation page. How people give is chosen when the site is built (content/donation.json):
   legacy  a link to the old donation page (no script needed)
   button  the Razorpay payment button of the old website, shown here
   native  our own form: the server makes the order, Razorpay Checkout takes the payment, the server confirms it */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const box = $('.donate-box');
  if (!box) return;
  const fallback = $('.donate-fallback', box);
  const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };

  /* ---- button: Razorpay's own script puts its button next to itself and opens the payment form over this page ---- */
  const embed = $('[data-razorpay-button]', box);
  if (embed) {
    const loading = $('.donate-loading', embed);
    let mounted = false;
    const mount = () => {
      if (mounted) return;
      mounted = true; fallback.hidden = true; loading.textContent = 'Loading the secure payment form…';
      const form = el('form'), script = el('script', { src: 'https://checkout.razorpay.com/v1/payment-button.js', async: true });
      script.dataset.payment_button_id = embed.dataset.razorpayButton;
      const ready = () => { clearTimeout(timer); watch.disconnect(); loading.remove(); };
      const fail = () => { clearTimeout(timer); watch.disconnect(); form.remove(); mounted = false; loading.textContent = ''; fallback.hidden = false; };
      const watch = new MutationObserver(() => { if ($('.razorpay-payment-button', form)) ready(); });
      watch.observe(form, { childList: true, subtree: true });
      script.onerror = fail;
      const timer = setTimeout(fail, 12000); // blocked or very slow: offer the original page instead
      form.append(script); embed.append(form);
    };
    const begin = () => navigator.onLine ? mount() : (loading.textContent = 'You are offline. The payment form appears as soon as you are connected.');
    addEventListener('online', () => { if (!mounted) begin(); }); // no reload needed
    begin();
  }

  /* ---- native: our form and our server ---- */
  const root = $('[data-donate-api]', box);
  if (!root) return;
  const api = root.dataset.donateApi;
  const call = async (path, body) => {
    const res = await fetch(api + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  };
  const loadScript = src => window.Razorpay ? Promise.resolve() : new Promise((ok, no) => { const s = el('script', { src, onload: ok, onerror: no }); document.head.append(s); });
  const wait = ms => new Promise(r => setTimeout(r, ms));

  const start = async () => {
    root.replaceChildren(el('p', { className: 'donate-loading', role: 'status', textContent: 'Loading the secure donation form…' }));
    let cfg;
    try { const r = await call('/donations/config'); if (!r.ok) throw new Error(r.status); cfg = r.data; }
    catch (err) { root.replaceChildren(); fallback.hidden = false; return; }
    fallback.hidden = true;
    render(cfg);
  };
  const render = cfg => {
    const money = n => `${cfg.symbol}${Number(n).toLocaleString('en-IN')}`;
    const field = (f, extra = {}) => {
      const input = el(f.type === 'textarea' ? 'textarea' : 'input', { id: 'd-' + f.name, name: f.name, type: f.type, placeholder: ' ', required: f.required !== false, maxLength: f.maxlength || 100, autocomplete: f.autocomplete || 'off', ...extra });
      if (f.pattern) input.pattern = f.pattern;
      if (f.inputmode) input.inputMode = f.inputmode;
      return el('div', { className: 'field' + (f.name === 'address' ? ' full' : '') }, input, el('label', { htmlFor: input.id, textContent: f.label }), el('span', { className: 'error' }));
    };
    const amount = field({ name: 'amount', label: `Other amount (${cfg.symbol})`, type: 'number', required: true }, { min: cfg.minAmount, max: cfg.maxAmount, step: 1, inputMode: 'numeric', autocomplete: 'off' });
    amount.firstChild.removeAttribute('maxlength');
    const chips = cfg.presets.map(n => el('button', { type: 'button', className: 'chip', textContent: money(n) }));
    chips.forEach(c => c.setAttribute('aria-pressed', 'false'));
    chips.forEach((c, i) => c.addEventListener('click', () => {
      amount.firstChild.value = cfg.presets[i]; amount.classList.remove('invalid');
      chips.forEach(o => o.setAttribute('aria-pressed', String(o === c)));
    }));
    amount.firstChild.addEventListener('input', () => chips.forEach((c, i) => c.setAttribute('aria-pressed', String(cfg.presets[i] === Number(amount.firstChild.value)))));
    const donorFields = cfg.fields.map(f => { const n = field(f); if (f.uppercase) n.firstChild.addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); }); return n; });
    const submit = el('button', { className: 'btn', type: 'submit' }, 'Donate now ', el('span', { className: 'arrow', textContent: '→' }));
    const state = el('div', { className: 'donate-state', role: 'status', hidden: true });
    const form = el('form', { className: 'form donate-form' },
      el('fieldset', { className: 'full donate-amount' }, el('legend', { textContent: `Choose an amount (${money(cfg.minAmount)} or more)` }), el('div', { className: 'chips' }, ...chips), amount),
      ...donorFields, el('div', { className: 'full form-actions' }, submit),
      el('p', { className: 'form-note full', textContent: 'Your card or bank details go straight to Razorpay and never reach this website. Your PAN and address are passed to Razorpay with the payment and are not kept here.' }));
    root.replaceChildren(form, state);

    const show = (kind, title, text, retry) => {
      state.className = `donate-state ${kind}`; state.hidden = false;
      state.replaceChildren(el('h3', { textContent: title }), el('p', { textContent: text }));
      if (retry) state.append(el('button', { className: 'btn ghost', type: 'button', textContent: 'Try again', onclick: retry }));
      form.hidden = ['success', 'pending'].includes(kind);
      state.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    const busy = on => { submit.disabled = on; form.setAttribute('aria-busy', String(on)); };

    // after a payment: the server checks Razorpay's signature; if that call is lost, ask the server what it knows
    const confirm = async (order, paid) => {
      show('pending', 'Confirming your payment…', 'Please keep this page open for a moment.');
      let result = null;
      try { result = await call('/donations/verify', { orderId: paid.razorpay_order_id, paymentId: paid.razorpay_payment_id, signature: paid.razorpay_signature }); } catch (err) { /* handled below */ }
      if (result?.ok) return show('success', 'Thank you for your contribution', `Your donation of ${money(order.amount / 100)} has been received. Jai Gurudev.`);
      if (result?.status === 400) return show('failed', 'We could not confirm the payment', `If money left your account, please write to us and quote ${order.orderId}.`);
      for (let i = 0; i < 20; i++) { // no answer yet: the webhook may confirm it
        await wait(3000);
        const s = await call('/donations/status?order=' + encodeURIComponent(order.orderId)).catch(() => null);
        if (s?.data.status === 'paid') return show('success', 'Thank you for your contribution', `Your donation of ${money(order.amount / 100)} has been received. Jai Gurudev.`);
      }
      show('pending', 'Your payment is being confirmed', `We have not heard back yet. If the amount left your account, it will be recorded; please write to us and quote ${order.orderId}.`);
    };
    const open = (order, donor) => {
      let finished = false, lastError = '';
      const checkout = new Razorpay({
        key: cfg.checkout.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency, name: cfg.merchantName, description: cfg.description,
        prefill: { name: donor.name, email: donor.email, contact: donor.phone }, theme: { color: cfg.themeColor },
        handler: paid => { finished = true; confirm(order, paid); },
        modal: { ondismiss: () => {
          busy(false);
          if (finished) return;
          call('/donations/cancel', { orderId: order.orderId }).catch(() => {});
          const again = () => { busy(true); state.hidden = true; open(order, donor); };
          if (lastError) show('failed', 'The payment did not go through', `${lastError} Nothing was charged for a failed payment.`, again);
          else show('cancelled', 'Payment window closed', 'No payment was made.', again);
        } },
      });
      checkout.on('payment.failed', r => { lastError = r.error?.description || ''; });
      checkout.open();
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (!navigator.onLine) return show('failed', 'You are offline', 'The donation form needs an internet connection. Please try again when you are connected.', () => { state.hidden = true; });
      state.hidden = true; busy(true);
      form.querySelectorAll('.invalid').forEach(f => f.classList.remove('invalid'));
      const donor = Object.fromEntries(cfg.fields.map(f => [f.name, form.elements[f.name].value.trim()]));
      try {
        const r = await call('/donations/orders', { amount: Number(amount.firstChild.value), donor });
        if (r.status === 422 && r.data.errors) {
          for (const [name, msg] of Object.entries(r.data.errors)) { const box = form.elements[name]?.closest('.field'); if (box) { box.classList.add('invalid'); $('.error', box).textContent = msg; } }
          busy(false); return form.querySelector('.invalid input')?.focus();
        }
        if (!r.ok) { busy(false); return show('failed', 'The payment could not be started', r.status === 429 ? 'Too many attempts in a short time. Please try again later.' : 'Please try again in a moment.', () => { state.hidden = true; }); }
        await loadScript(cfg.checkout.checkoutScript);
        open(r.data, donor);
      } catch (err) {
        busy(false);
        show('failed', 'The payment could not be started', 'Please check your internet connection and try again.', () => { state.hidden = true; });
      }
    });
  };
  addEventListener('online', () => { if ($('.donate-loading', root) || !$('form', root)) start(); });
  if (navigator.onLine) start(); else root.replaceChildren(el('p', { className: 'donate-loading', textContent: 'You are offline. The donation form appears as soon as you are connected.' }));
})();
