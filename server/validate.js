import { readFileSync } from 'node:fs';

const content = JSON.parse(
  readFileSync(new URL('../client/src/data/directions.json', import.meta.url), 'utf8'),
);
const allowed = (list) => new Set(list.map((o) => o.value));
export const VACANCIES = allowed(content.form.vacancies);
export const READINESS = allowed(content.form.readiness);
export const COURSES = allowed(content.form.course);
export const LEVELS = allowed(content.form.educationLevel);
export const EXPERIENCE = allowed(content.form.experience);
export const SOURCES = allowed(content.form.sources);
export const DIRECTIONS = new Set(Object.keys(content.directions));
export const LABELS = {
  vacancy: Object.fromEntries(content.form.vacancies.map((o) => [o.value, o.label])),
  readiness: Object.fromEntries(content.form.readiness.map((o) => [o.value, o.label])),
  course: Object.fromEntries(content.form.course.map((o) => [o.value, o.label])),
  education_level: Object.fromEntries(content.form.educationLevel.map((o) => [o.value, o.label])),
  experience: Object.fromEntries(content.form.experience.map((o) => [o.value, o.label])),
  source: Object.fromEntries(content.form.sources.map((o) => [o.value, o.label])),
  direction: Object.fromEntries(Object.entries(content.directions).map(([k, v]) => [k, v.title])),
};

export function ageOn(birthDate, now = new Date()) {
  const b = new Date(birthDate + 'T00:00:00');
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** Серверная проверка заявки. Возвращает { data } или { errors }. */
export function validateApplication(body = {}) {
  const errors = {};
  const fullName = str(body.fullName).replace(/\s+/g, ' ');
  const phoneDigits = str(body.phone).replace(/\D/g, '');
  const email = str(body.email);
  const birthDate = str(body.birthDate);
  const education = str(body.education);

  if (fullName.length < 5 || fullName.length > 120 || fullName.split(' ').length < 2)
    errors.fullName = 'Укажите фамилию и имя';
  if (!/^[78]?\d{10}$/.test(phoneDigits)) errors.phone = 'Телефон в формате +7 XXX XXX-XX-XX';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Проверьте e-mail';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || isNaN(Date.parse(birthDate))) {
    errors.birthDate = 'Укажите дату рождения';
  } else {
    const age = ageOn(birthDate);
    if (age < 18) errors.birthDate = 'На практику и работу принимаем с 18 лет';
    else if (age > 70) errors.birthDate = 'Проверьте дату рождения';
  }
  if (!VACANCIES.has(body.vacancy)) errors.vacancy = 'Выберите вакансию';
  if (!READINESS.has(body.readiness)) errors.readiness = 'Выберите вариант';
  const isStudent = body.isStudent === true ? true : body.isStudent === false ? false : null;
  if (isStudent === null) errors.isStudent = 'Выберите вариант';
  if (isStudent === true) {
    if (education.length < 2) errors.education = 'Укажите вуз или колледж';
    if (!COURSES.has(body.course)) errors.course = 'Выберите курс';
  }
  if (isStudent === false && !LEVELS.has(body.educationLevel)) errors.educationLevel = 'Выберите уровень образования';
  if (education.length > 200) errors.education = 'Слишком длинное название';
  if (!EXPERIENCE.has(body.experience)) errors.experience = 'Выберите вариант';
  if (!SOURCES.has(body.source)) errors.source = 'Выберите вариант';
  const experienceText = str(body.experienceText).slice(0, 500);
  if (body.consent !== true) errors.consent = 'Нужно согласие на обработку персональных данных';

  let scores = null;
  if (body.scores && typeof body.scores === 'object') {
    scores = {};
    for (const k of DIRECTIONS) scores[k] = Number(body.scores[k]) || 0;
  }
  const direction = DIRECTIONS.has(body.direction) ? body.direction : null;

  if (Object.keys(errors).length) return { errors };
  const phone = '+7' + phoneDigits.slice(-10);
  return {
    data: {
      session_id: str(body.sessionId).slice(0, 64) || null,
      full_name: fullName,
      phone,
      email: email || null,
      birth_date: birthDate,
      vacancy: body.vacancy,
      readiness: body.readiness,
      education,
      is_student: isStudent ? 1 : 0,
      course: isStudent ? body.course : '',
      education_level: isStudent ? null : body.educationLevel,
      experience: body.experience,
      experience_text: body.experience !== 'none' && experienceText ? experienceText : null,
      direction,
      scores: scores ? JSON.stringify(scores) : null,
      source: body.source,
      quiz_score: Number.isInteger(body.quizScore) && body.quizScore >= 0 && body.quizScore <= 20 ? body.quizScore : null,
    },
  };
}
