/* Digital Plus branded documents: PDF (A4) and Excel, Arabic + English.
   Usage: DPDocs.pdf(doc) / DPDocs.excel(doc)
   doc = { title, number, date, lang:'en'|'ar', to:{name,phone,address}, columns:[{key,label,align,fmt,width}],
           rows:[{...}], totals:[{label,value,big}], extras:[{label,value}], notes:[...], filename } */
(function () {
  const BASE = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]*$/, '');
  const LIBS = {
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    h2c: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    exceljs: 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'
  };
  const loaded = {};
  const load = src => loaded[src] || (loaded[src] = new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Could not load ' + src)); document.head.appendChild(s); }));
  const T = {
    en: { to: 'Prepared for', from: 'From', date: 'Date', no: 'No.', page: 'Page', of: 'of', valid: 'Prices in USD, checked on the date above. Final price and stock are confirmed by phone.', foot: 'Design concept · demo document', item: 'Item' },
    ar: { to: 'مُعدّ لـ', from: 'من', date: 'التاريخ', no: 'الرقم', page: 'صفحة', of: 'من', valid: 'الأسعار بالدولار الأمريكي حسب تاريخ أعلاه. السعر النهائي والتوفر يُؤكَّدان بالهاتف.', foot: 'تصميم مقترح · مستند تجريبي', item: 'المنتج' }
  };
  const CONTACT = { en: 'Damascus 011 2252736 · Aleppo 021 2236001 · WhatsApp 0930 334 001 · info@dpsy.com · dpsy.com', ar: 'دمشق 011 2252736 · حلب 021 2236001 · واتساب 0930 334 001 · info@dpsy.com · dpsy.com' };
  const contactHTML = lang => (lang === 'ar' ? [['دمشق', '011 2252736'], ['حلب', '021 2236001'], ['واتساب', '0930 334 001']] : [['Damascus', '011 2252736'], ['Aleppo', '021 2236001'], ['WhatsApp', '0930 334 001']]).map(([a, b]) => `${a} <span class="ltr">${b}</span>`).join(' · ') + ' · <span class="ltr">info@dpsy.com · dpsy.com</span>';
  const money = v => typeof v === 'number' ? '$' + Math.round(v).toLocaleString('en-US') : (v == null ? '' : String(v));
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (d, lang) => d.toLocaleDateString(lang === 'ar' ? 'ar-SY-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const cell = (c, r) => c.fmt === 'money' ? `<span class="ltr">${money(r[c.key])}</span>` : `<span class="auto" dir="auto">${esc(r[c.key])}</span>`;
  const safe = s => String(s).replace(/[^\w\-؀-ۿ ]+/g, '').trim().replace(/\s+/g, '-');

  function css() {
    if (document.getElementById('dpdoc-css')) return;
    const st = document.createElement('style'); st.id = 'dpdoc-css';
    st.textContent = `
.dpdoc{position:fixed;left:-12000px;top:0;width:794px;height:1123px;background:#fff;color:#0a0d12;font-family:Inter,"IBM Plex Sans Arabic",Arial,sans-serif;font-size:12px;line-height:1.45;box-sizing:border-box;overflow:hidden}
.dpdoc[dir=rtl]{font-family:"IBM Plex Sans Arabic",Inter,Arial,sans-serif}
.dpdoc *{box-sizing:border-box;margin:0;padding:0}
.dpdoc[dir=rtl] *{letter-spacing:0!important}
.dpdoc .ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}
.dpdoc .auto{unicode-bidi:plaintext}
.dpdoc .hd{background:#0a0d12;color:#fff;padding:30px 44px 26px;display:flex;justify-content:space-between;align-items:flex-end}
.dpdoc .hd img{height:46px;display:block}
.dpdoc .hd h1{font-size:24px;font-weight:800;letter-spacing:-.01em;text-align:end}
.dpdoc .hd .m{font-size:11.5px;color:#aeb8c2;margin-top:6px;text-align:end}
.dpdoc .hd .m b{color:#fff}
.dpdoc .bar{height:5px;background:#8bd13f}
.dpdoc .bd{padding:26px 44px 0}
.dpdoc .parties{display:flex;gap:16px;margin-bottom:20px}
.dpdoc .party{flex:1;background:#f4f5f7;border-radius:10px;padding:12px 14px}
.dpdoc .party small{display:block;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:#4e8a1c;font-weight:700;margin-bottom:4px}
.dpdoc[dir=rtl] .party small{letter-spacing:0;font-size:10.5px}
.dpdoc .party b{font-size:13px;display:block}
.dpdoc .party span{color:#5b6672;display:block}
.dpdoc table{width:100%;border-collapse:collapse}
.dpdoc th{background:#0a0d12;color:#fff;font-size:10.5px;font-weight:700;text-align:start;padding:9px 10px}
.dpdoc th:first-child{border-radius:0}
.dpdoc td{padding:9px 10px;border-bottom:1px solid #e7e9ed;vertical-align:top}
.dpdoc tr:nth-child(even) td{background:#fafbf7}
.dpdoc .r{text-align:end;white-space:nowrap}
.dpdoc .c{text-align:center}
.dpdoc td small{display:block;color:#8a94a0;font-size:10.5px;margin-top:2px}
.dpdoc .low{display:flex;gap:18px;margin-top:18px;align-items:flex-start}
.dpdoc .ex{flex:1}
.dpdoc .ex div{display:flex;gap:8px;padding:5px 0;border-bottom:1px dashed #e7e9ed;font-size:11.5px}
.dpdoc .ex div b{min-width:120px;color:#5b6672;font-weight:600}
.dpdoc .tot{width:270px;border:1px solid #e7e9ed;border-radius:12px;overflow:hidden}
.dpdoc .tot div{display:flex;justify-content:space-between;padding:8px 14px;font-size:12px}
.dpdoc .tot div.big{background:#0a0d12;color:#fff;padding:12px 14px}
.dpdoc .tot div.big b{color:#8bd13f;font-size:20px;font-weight:800}
.dpdoc .notes{margin-top:18px;font-size:11px;color:#5b6672}
.dpdoc .notes p{padding-inline-start:12px;position:relative;margin-bottom:3px}
.dpdoc .notes p::before{content:"";position:absolute;inset-inline-start:0;top:6px;width:5px;height:5px;border-radius:1px;background:#8bd13f}
.dpdoc .ft{position:absolute;left:0;right:0;bottom:0;padding:14px 44px 18px;border-top:4px solid #8bd13f;display:flex;justify-content:space-between;font-size:10px;color:#5b6672}
.dpdoc .ft b{color:#0a0d12}
`;
    document.head.appendChild(st);
  }

  function pageHTML(doc, rows, i, n, isLast) {
    const L = T[doc.lang] || T.en, ar = doc.lang === 'ar';
    const cols = doc.columns;
    const head = `<div class="hd"><img src="${BASE}logo-white.png" alt=""><div><h1>${esc(doc.title)}</h1><div class="m">${L.no} <b class="ltr">${esc(doc.number)}</b> · ${L.date} <b>${fmtDate(doc.date, doc.lang)}</b></div></div></div><div class="bar"></div>`;
    const parties = i === 0 ? `<div class="parties">${doc.to ? `<div class="party"><small>${L.to}</small><b>${esc(doc.to.name || '')}</b>${doc.to.phone ? `<span dir="ltr" style="text-align:${ar ? 'right' : 'left'}">${esc(doc.to.phone)}</span>` : ''}${doc.to.address ? `<span>${esc(doc.to.address)}</span>` : ''}</div>` : ''}<div class="party"><small>${L.from}</small><b>${ar ? 'ديجيتال بلس · Systems & Solutions' : 'Digital Plus · Systems & Solutions'}</b><span>${ar ? 'دمشق · حلب · سوريا' : 'Damascus · Aleppo · Syria'}</span></div></div>` : '';
    const table = `<table><thead><tr>${cols.map(c => `<th class="${c.align === 'r' ? 'r' : c.align === 'c' ? 'c' : ''}" style="${c.width ? 'width:' + c.width + 'px' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td class="${c.align === 'r' ? 'r' : c.align === 'c' ? 'c' : ''}">${cell(c, r)}${c.sub && r[c.sub] ? `<small class="auto" dir="auto">${esc(r[c.sub])}</small>` : ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const low = isLast && (doc.totals || doc.extras) ? `<div class="low"><div class="ex">${(doc.extras || []).map(e => `<div><b>${esc(e.label)}</b><span class="auto" dir="auto">${esc(e.value)}</span></div>`).join('')}</div>${doc.totals ? `<div class="tot">${doc.totals.map(t => `<div class="${t.big ? 'big' : ''}"><span>${esc(t.label)}</span><b class="${typeof t.value === 'number' ? 'ltr' : ''}">${money(t.value)}</b></div>`).join('')}</div>` : ''}</div>` : '';
    const notes = isLast ? `<div class="notes">${[...(doc.notes || []), L.valid].map(n => `<p class="auto" dir="auto">${esc(n)}</p>`).join('')}</div>` : '';
    const foot = `<div class="ft"><span><b>${ar ? 'ديجيتال بلس' : 'Digital Plus'}</b> · ${contactHTML(doc.lang)}</span><span>${L.foot} · ${L.page} ${i + 1} ${L.of} ${n}</span></div>`;
    return head + `<div class="bd">${parties}${table}${low}${notes}</div>` + foot;
  }

  async function pdf(doc) {
    await Promise.all([load(LIBS.jspdf), load(LIBS.h2c)]);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    css();
    const per = [], rows = doc.rows.slice(), first = doc.to ? 13 : 15, next = 20;
    per.push(rows.splice(0, first)); while (rows.length) per.push(rows.splice(0, next));
    if (per[per.length - 1].length > (per.length === 1 ? first - 5 : next - 6) && (doc.totals || doc.extras)) per.push([]);
    const { jsPDF } = window.jspdf;
    const out = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    for (let i = 0; i < per.length; i++) {
      const el = document.createElement('div');
      el.className = 'dpdoc'; el.dir = doc.lang === 'ar' ? 'rtl' : 'ltr'; el.lang = doc.lang;
      el.innerHTML = pageHTML(doc, per[i], i, per.length, i === per.length - 1);
      document.body.appendChild(el);
      await Promise.all([...el.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
      const canvas = await window.html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 794 });
      el.remove();
      if (i) out.addPage();
      out.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 595.28, 841.89);
    }
    out.setProperties({ title: doc.title + ' ' + doc.number, author: 'Digital Plus', creator: 'Digital Plus store' });
    out.save((doc.filename || safe('Digital-Plus ' + doc.title + ' ' + doc.number)) + '.pdf');
  }

  async function logoBase64() {
    const r = await fetch(BASE + 'logo.png'); const b = await r.blob();
    return await new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); });
  }

  async function excel(doc) {
    await load(LIBS.exceljs);
    const L = T[doc.lang] || T.en, ar = doc.lang === 'ar';
    const wb = new window.ExcelJS.Workbook(); wb.creator = 'Digital Plus'; wb.created = new Date();
    const ws = wb.addWorksheet(ar ? 'ديجيتال بلس' : 'Digital Plus', { views: [{ rightToLeft: ar, showGridLines: false }], pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    const cols = doc.columns, nC = cols.length;
    ws.columns = cols.map(c => ({ width: c.xw || (c.fmt === 'money' ? 14 : c.align === 'c' ? 10 : 34) }));
    const lime = 'FF8BD13F', ink = 'FF0A0D12', grey = 'FF5B6672';
    // logo + title block
    try { const img = wb.addImage({ base64: await logoBase64(), extension: 'png' }); ws.addImage(img, { tl: { col: 0.15, row: 0.25 }, ext: { width: 120, height: 62 } }); } catch (e) { }
    ws.getRow(1).height = 26; ws.getRow(2).height = 24; ws.getRow(3).height = 20;
    const tC = ws.getCell(1, nC); tC.value = doc.title; tC.font = { bold: true, size: 18, color: { argb: ink } }; tC.alignment = { horizontal: ar ? 'left' : 'right' };
    const mC = ws.getCell(2, nC); mC.value = `${L.no} ${doc.number}  ·  ${L.date} ${fmtDate(doc.date, doc.lang)}`; mC.font = { size: 10, color: { argb: grey } }; mC.alignment = { horizontal: ar ? 'left' : 'right' };
    let r = 5;
    for (let c = 1; c <= nC; c++) ws.getCell(4, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lime } };
    ws.getRow(4).height = 5;
    if (doc.to) {
      ws.getCell(r, 1).value = L.to; ws.getCell(r, 1).font = { bold: true, size: 9, color: { argb: 'FF4E8A1C' } };
      ws.getCell(r + 1, 1).value = [doc.to.name, doc.to.phone, doc.to.address].filter(Boolean).join('  ·  '); ws.getCell(r + 1, 1).font = { size: 11 };
      r += 3;
    }
    // header row
    const hr = ws.getRow(r); cols.forEach((c, i) => { const x = hr.getCell(i + 1); x.value = c.label; x.font = { bold: true, color: { argb: 'FFFFFFFF' } }; x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ink } }; x.alignment = { vertical: 'middle', horizontal: c.align === 'r' ? 'right' : c.align === 'c' ? 'center' : (ar ? 'right' : 'left') }; x.border = { bottom: { style: 'medium', color: { argb: lime } } }; });
    hr.height = 22; const headerRow = r; r++;
    doc.rows.forEach((row, k) => {
      const xr = ws.getRow(r);
      cols.forEach((c, i) => {
        const x = xr.getCell(i + 1); let v = row[c.key];
        if (c.sub && row[c.sub]) v = (v == null ? '' : v) + '\n' + row[c.sub];
        x.value = c.fmt === 'money' && typeof v === 'number' ? v : (v == null ? '' : v);
        if (c.fmt === 'money') x.numFmt = '"$"#,##0';
        x.alignment = { vertical: 'top', wrapText: true, horizontal: c.align === 'r' ? 'right' : c.align === 'c' ? 'center' : (ar ? 'right' : 'left') };
        if (k % 2) x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFBF7' } };
        x.border = { bottom: { style: 'thin', color: { argb: 'FFE7E9ED' } } };
      });
      r++;
    });
    if (doc.autoFilter) ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: r - 1, column: nC } };
    ws.views = [{ rightToLeft: ar, showGridLines: false, state: 'frozen', ySplit: headerRow }];
    if (doc.totals) {
      r++;
      doc.totals.forEach(t => {
        const lc = ws.getCell(r, Math.max(1, nC - 1)), vc = ws.getCell(r, nC);
        lc.value = t.label; lc.alignment = { horizontal: 'right' }; lc.font = { bold: !!t.big, color: { argb: t.big ? ink : grey } };
        vc.value = typeof t.value === 'number' ? t.value : t.value; if (typeof t.value === 'number') vc.numFmt = '"$"#,##0';
        vc.font = { bold: true, size: t.big ? 14 : 11, color: { argb: t.big ? 'FF4E8A1C' : ink } }; vc.alignment = { horizontal: 'right' };
        if (t.big) { lc.fill = vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8E6' } }; }
        r++;
      });
    }
    if (doc.extras && doc.extras.length) { r++; doc.extras.forEach(e => { ws.getCell(r, 1).value = e.label + ': ' + e.value; ws.getCell(r, 1).font = { size: 10, color: { argb: grey } }; r++; }); }
    r++;
    [...(doc.notes || []), L.valid].forEach(n => { ws.getCell(r, 1).value = '• ' + n; ws.getCell(r, 1).font = { size: 9, color: { argb: grey } }; r++; });
    r++;
    ws.getCell(r, 1).value = (ar ? 'ديجيتال بلس · ' : 'Digital Plus · ') + (CONTACT[doc.lang] || CONTACT.en); ws.getCell(r, 1).font = { size: 9, bold: true, color: { argb: ink } };
    ws.getCell(r + 1, 1).value = L.foot; ws.getCell(r + 1, 1).font = { size: 8, italic: true, color: { argb: 'FF8A94A0' } };
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (doc.filename || safe('Digital-Plus ' + doc.title + ' ' + doc.number)) + '.xlsx';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  const docNo = prefix => { const d = new Date(); return prefix + '-' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + Math.floor(1000 + Math.random() * 9000); };
  window.DPDocs = { pdf, excel, docNo };
})();
