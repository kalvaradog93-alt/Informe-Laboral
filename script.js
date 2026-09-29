const resizePrintTextareas = () => {
  const page = document.querySelector('.report-page');
  page.classList.add('print-mode');

  document.querySelectorAll('.report-page select').forEach((select) => {
    let printText = select.nextElementSibling;
    if (!printText || !printText.classList.contains('print-select-text')) {
      printText = document.createElement('div');
      printText.className = 'print-select-text';
      select.insertAdjacentElement('afterend', printText);
    }
    printText.textContent = select.value && select.value !== 'Otro'
      ? select.options[select.selectedIndex].text
      : '';
  });

  document.querySelectorAll('#description, #employeeInfo').forEach((textarea) => {
    let printText = textarea.nextElementSibling;
    if (!printText || !printText.classList.contains('print-text')) {
      printText = document.createElement('div');
      printText.className = 'print-text';
      textarea.insertAdjacentElement('afterend', printText);
    }
    printText.textContent = textarea.value;
  });

  document.querySelectorAll('.signature-fields label').forEach((label) => {
    const input = label.querySelector('input');
    let printText = label.nextElementSibling;

    if (!printText || !printText.classList.contains('print-signature-text')) {
      printText = document.createElement('span');
      printText.className = 'print-signature-text';
      label.insertAdjacentElement('afterend', printText);
    }

    printText.textContent = `${label.firstChild.textContent.trim()}: ${input.value}`;
  });
};

window.addEventListener('beforeprint', resizePrintTextareas);

const autoResizeTextareas = () => {
  document.querySelectorAll('#description, #employeeInfo').forEach((textarea) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  });
};

document.querySelectorAll('#description, #employeeInfo').forEach((textarea) => {
  textarea.addEventListener('input', autoResizeTextareas);
});
autoResizeTextareas();

document.querySelectorAll('[data-print]').forEach((button) => {
  button.addEventListener('click', () => {
    resizePrintTextareas();
    window.print();
  });
});

const toggleBox = (checkboxId, boxId) => {
  document.getElementById(checkboxId).addEventListener('change', (event) => {
    document.getElementById(boxId).hidden = !event.target.checked;
  });
};

toggleBox('includeEmployeeInfo', 'employeeInfoBox');
toggleBox('showSupervisor', 'supervisorSignature');
toggleBox('showManagement', 'managementSignature');
toggleBox('showEmployee', 'employeeSignature');

document.getElementById('cameraButton').addEventListener('click', () => document.getElementById('photos').click());

document.getElementById('workplace').addEventListener('change', (event) => {
  const box = document.getElementById('otherWorkplaceBox');
  const input = document.getElementById('otherWorkplace');
  const isOther = event.target.value === 'Otro';
  box.hidden = !isOther;
  input.required = isOther;
  if (!isOther) input.value = '';
});

const otherFault = document.getElementById('otherFault');

document.getElementById('faultType').addEventListener('change', (event) => {
  const box = document.getElementById('otherFaultBox');
  const isOther = event.target.value === 'Otro';
  box.hidden = !isOther;
  otherFault.required = isOther;
  if (!isOther) {
    otherFault.value = '';
    otherFault.style.height = '';
  }
});

const evidencePreview = document.getElementById('evidencePreview');
document.getElementById('photos').addEventListener('change', (event) => {
  [...event.target.files].forEach((file) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const item = document.createElement('div');
      item.className = 'evidence-item';
      item.innerHTML = `<img src="${reader.result}" alt="Evidencia"><button type="button" class="remove-evidence">Eliminar</button>`;
      item.querySelector('.remove-evidence').addEventListener('click', () => item.remove());
      evidencePreview.appendChild(item);
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
});

const signatureCanvases = new Map();

const setupSignature = (canvas) => {
  const context = canvas.getContext('2d');
  const card = canvas.closest('.signature-card');
  const signatureName = canvas.dataset.signature;
  const allowCheckbox = card.querySelector(`#allow${signatureName.charAt(0).toUpperCase() + signatureName.slice(1)}Signature`);
  const upload = card.querySelector('.signature-upload');
  let drawing = false;
  let ratio = 1;

  const resize = () => {
    ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.strokeStyle = '#123f7d';
    context.lineWidth = 2;
    context.lineCap = 'round';
  };

  const updateAccess = () => {
    const enabled = allowCheckbox.checked;
    const controls = card.querySelector('.digital-signature-controls');
    const physicalLine = card.querySelector('.physical-signature-line');
    canvas.classList.toggle('signature-disabled', !enabled);
    canvas.setAttribute('aria-disabled', String(!enabled));
    upload.disabled = !enabled;
    if (controls) controls.hidden = !enabled;
    if (physicalLine) physicalLine.hidden = enabled;
    if (!enabled) drawing = false;
  };

  const point = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  resize();
  updateAccess();
  allowCheckbox.addEventListener('change', updateAccess);

  canvas.addEventListener('pointerdown', (event) => {
    if (!allowCheckbox.checked) return;
    drawing = true;
    canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    context.beginPath();
    context.moveTo(p.x, p.y);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drawing || !allowCheckbox.checked) return;
    const p = point(event);
    context.lineTo(p.x, p.y);
    context.stroke();
  });
  canvas.addEventListener('pointerup', () => { drawing = false; });
  canvas.addEventListener('pointercancel', () => { drawing = false; });

  card.querySelector(`[data-clear="${signatureName}"]`).addEventListener('click', () => {
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  });

  signatureCanvases.set(signatureName, { canvas, context, allowCheckbox, resize });
  return { context, resize };
};

document.querySelectorAll('.signature-canvas').forEach(setupSignature);

window.addEventListener('resize', () => {
  signatureCanvases.forEach(({ resize }) => resize());
});

document.querySelectorAll('.signature-upload').forEach((input) => {
  input.addEventListener('change', () => {
    if (input.disabled) return;
    const signature = signatureCanvases.get(input.dataset.canvas);
    const file = input.files[0];
    if (!signature || !file) return;
    const image = new Image();
    image.onload = () => {
      signature.context.drawImage(image, 0, 0, signature.canvas.clientWidth, signature.canvas.clientHeight);
      URL.revokeObjectURL(image.src);
    };
    image.src = URL.createObjectURL(file);
  });
});
