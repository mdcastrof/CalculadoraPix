document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos do DOM ---
    const employeeSelect = document.getElementById('employeeSelect');
    const manualEmployeeSelect = document.getElementById('manualEmployeeSelect');
    const addEmployeeForm = document.getElementById('addEmployeeForm');
    const controlsContent = document.getElementById('controlsContent');
    const statusDiv = document.getElementById('status');
    const timerDiv = document.getElementById('timer');
    const logsTableBody = document.querySelector('#logsTable tbody');
    const manualEntryForm = document.getElementById('manualEntryForm');
    const currentEmployeeNameSpan = document.getElementById('currentEmployeeName');

    const clockInBtn = document.getElementById('clockInBtn');
    const clockOutBtn = document.getElementById('clockOutBtn');
    const lunchStartBtn = document.getElementById('lunchStartBtn');
    const lunchEndBtn = document.getElementById('lunchEndBtn');

    let selectedEmployeeId = null;
    let timerInterval = null;

    // --- Funções da API ---

    const apiCall = async (endpoint, method = 'GET', body = null) => {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' },
            };
            if (body) options.body = JSON.stringify(body);

            const response = await fetch(endpoint, options);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro na chamada à API: ${endpoint}`);
            }
            return response.status === 204 ? null : await response.json();
        } catch (error) {
            alert(`Erro: ${error.message}`);
            console.error('API Error:', error);
            throw error;
        }
    };

    const fetchEmployees = async () => {
        try {
            const employees = await apiCall('/api/employees');
            employeeSelect.innerHTML = '<option value="">-- Selecione um funcionário --</option>';
            manualEmployeeSelect.innerHTML = '<option value="">-- Selecione --</option>';
            employees.forEach(emp => {
                const option = new Option(emp.name, emp.id);
                employeeSelect.add(option.cloneNode(true));
                manualEmployeeSelect.add(option);
            });
        } catch (error) {
            employeeSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    };

    const handleEmployeeChange = async (employeeId) => {
        selectedEmployeeId = employeeId;
        if (!selectedEmployeeId) {
            controlsContent.style.display = 'none';
            currentEmployeeNameSpan.textContent = 'Nenhum';
            logsTableBody.innerHTML = '';
            return;
        }

        const selectedEmployeeName = employeeSelect.options[employeeSelect.selectedIndex].text;
        currentEmployeeNameSpan.textContent = selectedEmployeeName;
        controlsContent.style.display = 'block';

        try {
            await Promise.all([
                fetchLogs(selectedEmployeeId),
                fetchStatus(selectedEmployeeId)
            ]);
        } catch (error) {
            statusDiv.textContent = 'Erro ao carregar dados do funcionário.';
        }
    };

    const fetchStatus = async (employeeId) => {
        const status = await apiCall(`/api/status/${employeeId}`);
        updateUI(status);
    };

    const fetchLogs = async (employeeId) => {
        const data = await apiCall(`/api/logs/${employeeId}`);
        renderLogs(data.logs);
    };

    // --- Lógica de UI ---

    const updateUI = (status) => {
        clearInterval(timerInterval);
        timerDiv.textContent = '';

        if (!status || !status.clocked_in) {
            clockInBtn.disabled = false;
            clockOutBtn.disabled = true;
            lunchStartBtn.disabled = true;
            lunchEndBtn.disabled = true;
            statusDiv.textContent = 'Pronto para iniciar o trabalho.';
        } else {
            clockInBtn.disabled = true;
            clockOutBtn.disabled = false;
            statusDiv.textContent = `Trabalhando desde ${new Date(status.start_time).toLocaleTimeString('pt-BR')}.`;

            if (status.on_lunch) {
                lunchStartBtn.disabled = true;
                lunchEndBtn.disabled = false;
                clockOutBtn.disabled = true; // Não pode sair durante o almoço
                statusDiv.textContent += ` Em horário de almoço desde ${new Date(status.lunch_start_time).toLocaleTimeString('pt-BR')}.`;
            } else {
                lunchStartBtn.disabled = false;
                lunchEndBtn.disabled = true;
            }
            startTimer(new Date(status.start_time));
        }
    };

    const startTimer = (startTime) => {
        timerInterval = setInterval(() => {
            const now = new Date();
            const diff = now - startTime;
            const hours = String(Math.floor(diff / 3600000)).padStart(2, '0');
            const minutes = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
            const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
            timerDiv.textContent = `Tempo total: ${hours}:${minutes}:${seconds}`;
        }, 1000);
    };

    const renderLogs = (logs) => {
        logsTableBody.innerHTML = '';
        if (!logs || logs.length === 0) {
            logsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum registro para este funcionário.</td></tr>';
            return;
        }

        logs.forEach(log => {
            const row = document.createElement('tr');
            const startTime = new Date(log.start_time);
            const endTime = log.end_time ? new Date(log.end_time) : null;

            const formatDuration = (durationStr) => {
                if (!durationStr || durationStr.startsWith('0:00:00')) return '---';
                const parts = durationStr.split(':');
                const h = parts[0].padStart(2, '0');
                const m = parts[1].padStart(2, '0');
                const s = parts[2].split('.')[0].padStart(2, '0');
                return `${h}:${m}:${s}`;
            };

            row.innerHTML = `
                <td>${startTime.toLocaleString('pt-BR')}</td>
                <td>${endTime ? endTime.toLocaleString('pt-BR') : 'Em andamento'}</td>
                <td>${formatDuration(log.lunch_duration)}</td>
                <td>${formatDuration(log.duration)}</td>
                <td>${log.notes || '---'}</td>
            `;
            logsTableBody.appendChild(row);
        });
    };

    // --- Event Handlers ---

    const onClockIn = () => apiCall('/api/clock-in', 'POST', { employee_id: selectedEmployeeId }).then(() => handleEmployeeChange(selectedEmployeeId));
    const onClockOut = () => apiCall('/api/clock-out', 'POST', { employee_id: selectedEmployeeId }).then(() => handleEmployeeChange(selectedEmployeeId));
    const onLunchStart = () => apiCall('/api/lunch-start', 'POST', { employee_id: selectedEmployeeId }).then(() => handleEmployeeChange(selectedEmployeeId));
    const onLunchEnd = () => apiCall('/api/lunch-end', 'POST', { employee_id: selectedEmployeeId }).then(() => handleEmployeeChange(selectedEmployeeId));

    const onAddEmployee = async (e) => {
        e.preventDefault();
        const name = document.getElementById('employeeName').value;
        const schedule_type = document.getElementById('scheduleType').value;
        try {
            await apiCall('/api/employees', 'POST', { name, schedule_type });
            addEmployeeForm.reset();
            await fetchEmployees();
        } catch (error) { /* Erro já tratado em apiCall */ }
    };

    const onAddManualLog = async (e) => {
        e.preventDefault();
        const employee_id = manualEmployeeSelect.value;
        const start_time = document.getElementById('start_time').value;
        const end_time = document.getElementById('end_time').value;
        const notes = document.getElementById('notes').value;
        try {
            await apiCall('/api/add-manual', 'POST', { employee_id, start_time, end_time, notes });
            manualEntryForm.reset();
            if (employee_id === selectedEmployeeId) {
                await fetchLogs(selectedEmployeeId);
            }
        } catch (error) { /* Erro já tratado em apiCall */ }
    };

    // --- Inicialização e Event Listeners ---

    employeeSelect.addEventListener('change', (e) => handleEmployeeChange(e.target.value));
    addEmployeeForm.addEventListener('submit', onAddEmployee);
    manualEntryForm.addEventListener('submit', onAddManualLog);

    clockInBtn.addEventListener('click', onClockIn);
    clockOutBtn.addEventListener('click', onClockOut);
    lunchStartBtn.addEventListener('click', onLunchStart);
    lunchEndBtn.addEventListener('click', onLunchEnd);

    fetchEmployees(); // Ponto de entrada
});
