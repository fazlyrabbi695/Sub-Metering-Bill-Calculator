let meterCount = 0;

function createMeterInput(name = '', prev = '', curr = '', index = 1) {
  meterCount++;
  const container = document.createElement('div');
  container.className = 'meter-container';
  container.id = 'meter-' + meterCount;

  const meterName = name.trim() === '' ? `সাব মিটার ${index}` : name;

  container.innerHTML = `
    <button type="button" class="remove-meter" onclick="removeMeter('${container.id}')">বাতিল</button>
    <label>সাব মিটার নাম</label>
    <input type="text" class="meter-name" placeholder="যেমন: অফিস, ফ্ল্যাট ১" value="${meterName}" />

    <label>গত মাসের রিডিং (kWh)</label>
    <input type="number" min="0" step="any" class="meter-prev" placeholder="যেমন: 5000" value="${prev}" />

    <label>বর্তমান মাসের রিডিং (kWh)</label>
    <input type="number" min="0" step="any" class="meter-curr" placeholder="যেমন: 5400" value="${curr}" />
  `;
  return container;
}

function addMeter() {
  const metersContainer = document.getElementById('metersContainer');
  const count = metersContainer.children.length + 1;
  metersContainer.appendChild(createMeterInput('', '', '', count));
  saveData();
}

function removeMeter(id) {
  const el = document.getElementById(id);
  if (el) {
    el.remove();
    saveData();
  }
}

document.getElementById('addMeterBtn').addEventListener('click', () => {
  addMeter();
});

document.getElementById('calculateBtn').addEventListener('click', () => {
  calculateBills();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  exportToExcelXLSX();
});

function saveData() {
  const mainPrev = document.getElementById('mainPrev').value;
  const mainCurr = document.getElementById('mainCurr').value;
  const totalBill = document.getElementById('totalBill').value;

  const metersContainer = document.getElementById('metersContainer');
  const meterNames = [...metersContainer.getElementsByClassName('meter-name')];
  const meterPrev = [...metersContainer.getElementsByClassName('meter-prev')];
  const meterCurr = [...metersContainer.getElementsByClassName('meter-curr')];

  let meters = [];

  for (let i = 0; i < meterNames.length; i++) {
    meters.push({
      name: meterNames[i].value,
      prev: meterPrev[i].value,
      curr: meterCurr[i].value
    });
  }

  const data = {
    mainPrev,
    mainCurr,
    totalBill,
    meters
  };

  localStorage.setItem('subMeterCalcData', JSON.stringify(data));
}

function loadData() {
  const savedData = localStorage.getItem('subMeterCalcData');
  const metersContainer = document.getElementById('metersContainer');
  metersContainer.innerHTML = '';

  if (!savedData) {
    addMeter();
    addMeter();
    addMeter();
    return;
  }

  const data = JSON.parse(savedData);
  document.getElementById('mainPrev').value = data.mainPrev || '';
  document.getElementById('mainCurr').value = data.mainCurr || '';
  document.getElementById('totalBill').value = data.totalBill || '';

  if (data.meters && data.meters.length > 0) {
    data.meters.forEach((m, i) => {
      metersContainer.appendChild(createMeterInput(m.name, m.prev, m.curr, i + 1));
    });
  } else {
    addMeter();
    addMeter();
    addMeter();
  }
}

function calculateBills() {
  document.getElementById('errorMsg').innerText = '';
  document.getElementById('result').innerText = '';

  const mainPrev = parseFloat(document.getElementById('mainPrev').value);
  const mainCurr = parseFloat(document.getElementById('mainCurr').value);
  const totalBill = parseFloat(document.getElementById('totalBill').value);

  if (isNaN(mainPrev) || isNaN(mainCurr) || isNaN(totalBill)) {
    document.getElementById('errorMsg').innerText = 'অনুগ্রহ করে মেইন মিটার এবং মোট বিলের সব ফিল্ড সঠিকভাবে পূরণ করুন।';
    return;
  }
  if (mainCurr < mainPrev) {
    document.getElementById('errorMsg').innerText = 'বর্তমান মাসের মেইন রিডিং অবশ্যই গত মাসের থেকে বড় হতে হবে!';
    return;
  }

  const mainUnits = mainCurr - mainPrev;

  const metersContainer = document.getElementById('metersContainer');
  const meterNames = [...metersContainer.getElementsByClassName('meter-name')];
  const meterPrev = [...metersContainer.getElementsByClassName('meter-prev')];
  const meterCurr = [...metersContainer.getElementsByClassName('meter-curr')];

  let totalSubUnits = 0;
  let metersData = [];

  for (let i = 0; i < meterNames.length; i++) {
    const name = meterNames[i].value.trim() || `সাব মিটার ${i + 1}`;
    const prev = parseFloat(meterPrev[i].value);
    const curr = parseFloat(meterCurr[i].value);

    if (isNaN(prev) || isNaN(curr)) {
      document.getElementById('errorMsg').innerText = `সাব মিটার "${name}" এর রিডিং পূরণ করুন।`;
      return;
    }
    if (curr < prev) {
      document.getElementById('errorMsg').innerText = `সাব মিটার "${name}" এর বর্তমান রিডিং অবশ্যই গত মাসের থেকে বড় হতে হবে!`;
      return;
    }

    const units = curr - prev;
    totalSubUnits += units;

    metersData.push({ name, units });
  }

  if (Math.abs(mainUnits - totalSubUnits) > 0.01) {
    document.getElementById('errorMsg').innerText = `⚠️ সতর্কতা: মেইন মিটার ইউনিট (${mainUnits.toFixed(2)}) এবং সাব মিটার ইউনিটের যোগফল (${totalSubUnits.toFixed(2)}) মিলছে না।`;
  } else {
    document.getElementById('errorMsg').innerText = '';
  }

  const unitCost = totalBill / mainUnits;

  let totalCalculatedBill = 0;
  let resultText = `মেইন মিটার ব্যবহার: ${mainUnits.toFixed(2)} kWh\n\n`;

  metersData.forEach(meter => {
    const bill = meter.units * unitCost;
    totalCalculatedBill += bill;
    resultText += `${meter.name} ব্যবহার: ${meter.units.toFixed(2)} kWh → বিল: ${bill.toFixed(2)} টাকা\n`;
  });

  resultText += `\nমোট বিল দেওয়া হয়েছে: ${totalBill.toFixed(2)} টাকা\n`;
  resultText += `হিসাবকৃত মোট বিল: ${totalCalculatedBill.toFixed(2)} টাকা\n`;

  if (Math.abs(totalBill - totalCalculatedBill) > 1) {
    if (Math.abs(mainUnits - totalSubUnits) > 0.01) {
      resultText += `\n⚠️ সতর্কতা: ${(mainUnits - totalSubUnits).toFixed(2)} ইউনিট এর দাম ${(unitCost * (mainUnits - totalSubUnits)).toFixed(2)} টাকা মেইন মিটার থেকে দেয়া হয়েছে। অনুগ্রহ করে সঠিক ভাবে ইউনিট ইনপুট করুন।`;
    } else {
      resultText += `\n⚠️ সতর্কতা: দেওয়া মোট বিল এবং হিসাবকৃত মোট বিলের মধ্যে পার্থক্য রয়েছে!`;
    }
  }

  document.getElementById('result').innerText = resultText;

  saveData();
}

function getFileName() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');

  return `submeter_bill_${y}${m}${d}_${h}${min}${s}.xlsx`;
}

function exportToExcelXLSX() {
  const mainPrev = parseFloat(document.getElementById('mainPrev').value);
  const mainCurr = parseFloat(document.getElementById('mainCurr').value);
  const totalBill = parseFloat(document.getElementById('totalBill').value);

  const metersContainer = document.getElementById('metersContainer');
  const meterNames = [...metersContainer.getElementsByClassName('meter-name')];
  const meterPrev = [...metersContainer.getElementsByClassName('meter-prev')];
  const meterCurr = [...metersContainer.getElementsByClassName('meter-curr')];

  let totalSubUnits = 0;

  let data = [
    ['মেইন মিটার গত মাসের রিডিং', 'মেইন মিটার বর্তমান মাসের রিডিং', 'মোট বিল (টাকা)'],
    [mainPrev, mainCurr, totalBill],
    [],
    ['সাব মিটার নাম', 'গত মাসের রিডিং (kWh)', 'বর্তমান মাসের রিডিং (kWh)', 'ইউনিট (kWh)', 'বিল (টাকা)']
  ];

  const mainUnits = mainCurr - mainPrev;
  const unitCost = totalBill / mainUnits;

  for (let i = 0; i < meterNames.length; i++) {
    const name = meterNames[i].value.trim() || `সাব মিটার ${i + 1}`;
    const prev = parseFloat(meterPrev[i].value);
    const curr = parseFloat(meterCurr[i].value);
    const units = curr - prev;
    totalSubUnits += units;
    const bill = units * unitCost;

    data.push([name, prev, curr, units.toFixed(2), bill.toFixed(2)]);
  }

  let warningText = "";
  if (Math.abs(mainUnits - totalSubUnits) > 0.01) {
    warningText = `⚠️ সতর্কতা: ${(mainUnits - totalSubUnits).toFixed(2)} ইউনিট এর দাম ${(unitCost * (mainUnits - totalSubUnits)).toFixed(2)} টাকা মেইন মিটার থেকে দেয়া হয়েছে। অনুগ্রহ করে সঠিক ভাবে ইউনিট ইনপুট করুন।`;
  }

  if (warningText) {
    data.push([]);
    data.push([warningText]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  if (warningText) {
    const lastRow = data.length;
    const cellRef = `A${lastRow}`;
    if (!ws[cellRef]) ws[cellRef] = { t: 's', v: warningText };
    ws[cellRef].s = {
      font: {
        color: { rgb: "FF0000" },
        bold: true,
      }
    };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'সাব মিটার বিল');

  XLSX.writeFile(wb, getFileName());
}

window.onload = loadData;
