import os
from flask import Flask, jsonify, request, render_template
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta

# --- Configuração do Banco de Dados ---
app = Flask(__name__, static_folder='static', template_folder='templates')
# Salva o banco de dados no diretório /tmp para contornar problemas de permissão
database_path = os.path.join('/tmp', 'bancodehoras.db')
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{database_path}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# --- Modelos do Banco de Dados ---

class Employee(db.Model):
    """Modelo para os funcionários."""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    schedule_type = db.Column(db.String(50), nullable=False, default='normal') # 'normal' ou '12/36'

    time_logs = db.relationship('TimeLog', backref='employee', lazy=True)

    def __repr__(self):
        return f"<Employee {self.name}>"

class TimeLog(db.Model):
    """Modelo para armazenar os registros de ponto."""
    id = db.Column(db.Integer, primary_key=True)
    start_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    end_time = db.Column(db.DateTime, nullable=True)
    lunch_start = db.Column(db.DateTime, nullable=True)
    lunch_end = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.String(300), nullable=True)

    employee_id = db.Column(db.Integer, db.ForeignKey('employee.id'), nullable=False)

    def __repr__(self):
        return f"<TimeLog id={self.id} employee_id={self.employee_id}>"

    @property
    def lunch_duration(self):
        """Calcula a duração do almoço."""
        if self.lunch_start and self.lunch_end:
            return self.lunch_end - self.lunch_start
        return timedelta(0)

    @property
    def duration(self):
        """Calcula a duração do trabalho (descontando o almoço)."""
        if self.end_time:
            total_duration = self.end_time - self.start_time
            return total_duration - self.lunch_duration
        return None

# --- Rotas da Aplicação ---

@app.route('/')
def index():
    """Renderiza a página principal."""
    return render_template('index.html')

# --- API para Funcionários ---

@app.route('/api/employees', methods=['GET'])
def get_employees():
    employees = Employee.query.all()
    return jsonify([{'id': e.id, 'name': e.name, 'schedule_type': e.schedule_type} for e in employees])

@app.route('/api/employees', methods=['POST'])
def add_employee():
    data = request.get_json()
    name = data.get('name')
    schedule = data.get('schedule_type', 'normal')
    if not name:
        return jsonify({'success': False, 'message': 'O nome do funcionário é obrigatório.'}), 400

    if Employee.query.filter_by(name=name).first():
        return jsonify({'success': False, 'message': 'Já existe um funcionário com este nome.'}), 400

    new_employee = Employee(name=name, schedule_type=schedule)
    db.session.add(new_employee)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Funcionário adicionado com sucesso!', 'id': new_employee.id}), 201

# --- API para Controle de Ponto ---

def get_active_log(employee_id):
    """Busca o registro de ponto ativo para um funcionário."""
    return TimeLog.query.filter_by(employee_id=employee_id, end_time=None).first()

@app.route('/api/status/<int:employee_id>', methods=['GET'])
def get_status(employee_id):
    active_log = get_active_log(employee_id)
    if not active_log:
        return jsonify({'clocked_in': False})

    return jsonify({
        'clocked_in': True,
        'start_time': active_log.start_time.isoformat(),
        'on_lunch': active_log.lunch_start is not None and active_log.lunch_end is None,
        'lunch_start_time': active_log.lunch_start.isoformat() if active_log.lunch_start else None,
    })

@app.route('/api/clock-in', methods=['POST'])
def clock_in():
    data = request.get_json()
    employee_id = data.get('employee_id')
    if not employee_id:
        return jsonify({'success': False, 'message': 'ID do funcionário é obrigatório.'}), 400

    if get_active_log(employee_id):
        return jsonify({'success': False, 'message': 'Este funcionário já possui um ponto de entrada em aberto.'}), 400

    new_log = TimeLog(employee_id=employee_id, start_time=datetime.utcnow())
    db.session.add(new_log)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Ponto de entrada registrado!'}), 201

@app.route('/api/clock-out', methods=['POST'])
def clock_out():
    data = request.get_json()
    employee_id = data.get('employee_id')
    active_log = get_active_log(employee_id)
    if not active_log:
        return jsonify({'success': False, 'message': 'Nenhum ponto de entrada aberto para este funcionário.'}), 400

    if active_log.lunch_start and not active_log.lunch_end:
        return jsonify({'success': False, 'message': 'É necessário finalizar o almoço antes de bater o ponto de saída.'}), 400

    active_log.end_time = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'message': 'Ponto de saída registrado!'})

@app.route('/api/lunch-start', methods=['POST'])
def lunch_start():
    data = request.get_json()
    employee_id = data.get('employee_id')
    active_log = get_active_log(employee_id)
    if not active_log:
        return jsonify({'success': False, 'message': 'Funcionário não está com ponto de entrada registrado.'}), 400
    if active_log.lunch_start:
        return jsonify({'success': False, 'message': 'Almoço já iniciado.'}), 400

    active_log.lunch_start = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'message': 'Início do almoço registrado.'})

@app.route('/api/lunch-end', methods=['POST'])
def lunch_end():
    data = request.get_json()
    employee_id = data.get('employee_id')
    active_log = get_active_log(employee_id)
    if not active_log or not active_log.lunch_start:
        return jsonify({'success': False, 'message': 'Não há um almoço em andamento para finalizar.'}), 400
    if active_log.lunch_end:
        return jsonify({'success': False, 'message': 'Almoço já finalizado.'}), 400

    active_log.lunch_end = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'message': 'Fim do almoço registrado.'})

@app.route('/api/logs/<int:employee_id>', methods=['GET'])
def get_logs(employee_id):
    logs = TimeLog.query.filter_by(employee_id=employee_id).order_by(TimeLog.start_time.desc()).all()

    serialized_logs = []
    for log in logs:
        log_data = {
            'id': log.id,
            'start_time': log.start_time.isoformat(),
            'end_time': log.end_time.isoformat() if log.end_time else None,
            'lunch_duration': str(log.lunch_duration),
            'duration': str(log.duration) if log.duration else None,
            'notes': log.notes
        }
        serialized_logs.append(log_data)

    return jsonify({'logs': serialized_logs})

@app.route('/api/add-manual', methods=['POST'])
def add_manual_log():
    data = request.get_json()
    employee_id = data.get('employee_id')
    start_time_str = data.get('start_time')
    end_time_str = data.get('end_time')
    notes = data.get('notes')

    if not all([employee_id, start_time_str, end_time_str]):
        return jsonify({'success': False, 'message': 'Funcionário, data de início e fim são obrigatórios.'}), 400

    try:
        start_time = datetime.fromisoformat(start_time_str)
        end_time = datetime.fromisoformat(end_time_str)
    except ValueError:
        return jsonify({'success': False, 'message': 'Formato de data inválido.'}), 400

    if start_time >= end_time:
        return jsonify({'success': False, 'message': 'O horário de início deve ser anterior ao de fim.'}), 400

    new_log = TimeLog(
        employee_id=employee_id,
        start_time=start_time,
        end_time=end_time,
        notes=notes
    )
    db.session.add(new_log)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Registro manual adicionado com sucesso!'}), 201

# --- Bloco de Execução Principal ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
