-- تشغيل هذا الملف في SQL Editor في مشروع Supabase

CREATE TABLE IF NOT EXISTS employees (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id         varchar(3) UNIQUE NOT NULL,
  name                varchar NOT NULL,
  hourly_rate         decimal(10,6) NOT NULL,
  transport_allowance decimal(10,6) DEFAULT 0,
  daily_rate          decimal(10,6),
  weekly_rate         decimal(10,6),
  created_at          timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id         uuid REFERENCES employees(id) ON DELETE CASCADE,
  date                date NOT NULL,
  day_of_week         varchar NOT NULL,
  check_in            time,
  check_out           time,
  hours_worked        decimal(10,6),
  overtime_hours      decimal(10,6) DEFAULT 0,
  daily_wage          decimal(10,6),
  is_carried_over     boolean DEFAULT false,
  carried_over_amount decimal(10,6) DEFAULT 0,
  week_start_date     date NOT NULL,
  created_at          timestamp DEFAULT now(),
  UNIQUE (employee_id, week_start_date, date)
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow all" ON employees;
CREATE POLICY "allow all" ON employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow all" ON attendance;
CREATE POLICY "allow all" ON attendance FOR ALL USING (true) WITH CHECK (true);
