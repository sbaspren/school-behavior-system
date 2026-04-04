import {
  DEGREE_LABELS,
  TYPE_LABELS,
  TARDINESS_TYPES,
  PERIODS,
  getRequiredForms,
  SETTINGS_STAGES,
  SECTION_THEMES,
  FORM_PATTERNS,
  CLASS_LETTERS,
  BEHAVIOR_TYPES,
  SCHOOL_DAYS,
  USER_ROLES,
  ADMIN_ROLES,
  SECONDARY_TRACKS,
  STAGE_SUBJECTS,
} from '../../utils/constants';

describe('constants', () => {
  test('DEGREE_LABELS has 5 degrees', () => {
    expect(Object.keys(DEGREE_LABELS)).toHaveLength(5);
  });

  test('DEGREE_LABELS keys are 1 through 5', () => {
    for (let i = 1; i <= 5; i++) {
      expect(DEGREE_LABELS[i]).toBeDefined();
      expect(DEGREE_LABELS[i]).toHaveProperty('label');
      expect(DEGREE_LABELS[i]).toHaveProperty('color');
      expect(DEGREE_LABELS[i]).toHaveProperty('bg');
    }
  });

  test('TYPE_LABELS has 3 types', () => {
    expect(Object.keys(TYPE_LABELS)).toHaveLength(3);
  });

  test('TYPE_LABELS contains expected keys', () => {
    expect(TYPE_LABELS).toHaveProperty('InPerson');
    expect(TYPE_LABELS).toHaveProperty('Digital');
    expect(TYPE_LABELS).toHaveProperty('Educational');
  });

  test('TARDINESS_TYPES has 3 types', () => {
    expect(Object.keys(TARDINESS_TYPES)).toHaveLength(3);
  });

  test('TARDINESS_TYPES contains Morning, Period, Assembly', () => {
    expect(TARDINESS_TYPES).toHaveProperty('Morning');
    expect(TARDINESS_TYPES).toHaveProperty('Period');
    expect(TARDINESS_TYPES).toHaveProperty('Assembly');
  });

  test('PERIODS has 7 periods', () => {
    expect(PERIODS).toHaveLength(7);
  });

  test('SETTINGS_STAGES has 4 stages', () => {
    expect(SETTINGS_STAGES).toHaveLength(4);
  });

  test('SETTINGS_STAGES each has id, name, and grades', () => {
    for (const stage of SETTINGS_STAGES) {
      expect(stage).toHaveProperty('id');
      expect(stage).toHaveProperty('name');
      expect(stage).toHaveProperty('grades');
      expect(Array.isArray(stage.grades)).toBe(true);
      expect(stage.grades.length).toBeGreaterThan(0);
    }
  });

  test('SECTION_THEMES has all sections', () => {
    expect(SECTION_THEMES).toHaveProperty('violations');
    expect(SECTION_THEMES).toHaveProperty('absence');
    expect(SECTION_THEMES).toHaveProperty('tardiness');
    expect(SECTION_THEMES).toHaveProperty('permissions');
    expect(SECTION_THEMES).toHaveProperty('notes');
    expect(SECTION_THEMES).toHaveProperty('positive');
  });

  test('SECTION_THEMES values are valid hex colors', () => {
    for (const color of Object.values(SECTION_THEMES)) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  test('CLASS_LETTERS has 20 Arabic letters', () => {
    expect(CLASS_LETTERS).toHaveLength(20);
  });

  test('BEHAVIOR_TYPES is a non-empty array of strings', () => {
    expect(BEHAVIOR_TYPES.length).toBeGreaterThan(0);
    for (const t of BEHAVIOR_TYPES) {
      expect(typeof t).toBe('string');
    }
  });

  test('SCHOOL_DAYS is 180', () => {
    expect(SCHOOL_DAYS).toBe(180);
  });

  test('USER_ROLES has value and label for each role', () => {
    expect(USER_ROLES.length).toBeGreaterThan(0);
    for (const role of USER_ROLES) {
      expect(role).toHaveProperty('value');
      expect(role).toHaveProperty('label');
    }
  });

  test('ADMIN_ROLES is a non-empty array of strings', () => {
    expect(ADMIN_ROLES.length).toBeGreaterThan(0);
    for (const r of ADMIN_ROLES) {
      expect(typeof r).toBe('string');
    }
  });

  test('SECONDARY_TRACKS has Semester and Tracks', () => {
    expect(SECONDARY_TRACKS).toHaveProperty('Semester');
    expect(SECONDARY_TRACKS).toHaveProperty('Tracks');
  });

  test('STAGE_SUBJECTS covers Primary, Intermediate, Secondary', () => {
    expect(STAGE_SUBJECTS).toHaveProperty('Primary');
    expect(STAGE_SUBJECTS).toHaveProperty('Intermediate');
    expect(STAGE_SUBJECTS).toHaveProperty('Secondary');
    for (const key of ['Primary', 'Intermediate', 'Secondary']) {
      expect(STAGE_SUBJECTS[key].subjects.length).toBeGreaterThan(0);
    }
  });

  test('FORM_PATTERNS has 7 patterns', () => {
    expect(FORM_PATTERNS).toHaveLength(7);
  });
});

describe('getRequiredForms', () => {
  test('detects tahood_slooki for text containing تعهد', () => {
    const forms = getRequiredForms('يتم تعهد الطالب');
    expect(forms.has('tahood_slooki')).toBe(true);
  });

  test('detects dawat_wali_amr for text containing دعوة ولي', () => {
    const forms = getRequiredForms('دعوة ولي الأمر للحضور');
    expect(forms.has('dawat_wali_amr')).toBe(true);
  });

  test('detects ishar_wali_amr for text containing إشعار ولي', () => {
    const forms = getRequiredForms('إرسال إشعار لولي الأمر');
    expect(forms.has('ishar_wali_amr')).toBe(true);
  });

  test('detects ehalat_talib for text containing إحالة', () => {
    const forms = getRequiredForms('إحالة الطالب');
    expect(forms.has('ehalat_talib')).toBe(true);
  });

  test('detects mahdar_lajnah for text containing لجنة التوجيه', () => {
    const forms = getRequiredForms('عقد اجتماع لجنة التوجيه');
    expect(forms.has('mahdar_lajnah')).toBe(true);
  });

  test('detects mahdar_dab_wakea for text containing محضر ضبط', () => {
    const forms = getRequiredForms('تدوين محضر ضبط الواقعة');
    expect(forms.has('mahdar_dab_wakea')).toBe(true);
  });

  test('detects tawid_darajat for text containing فرص التعويض', () => {
    const forms = getRequiredForms('تمكين فرص التعويض');
    expect(forms.has('tawid_darajat')).toBe(true);
  });

  test('returns empty set for empty string', () => {
    expect(getRequiredForms('').size).toBe(0);
  });

  test('returns empty set for unrelated text', () => {
    expect(getRequiredForms('نص عادي لا يحتوي أي نمط').size).toBe(0);
  });

  test('detects multiple forms in combined text', () => {
    const forms = getRequiredForms('يتم تعهد الطالب وإحالة الطالب');
    expect(forms.has('tahood_slooki')).toBe(true);
    expect(forms.has('ehalat_talib')).toBe(true);
    expect(forms.size).toBeGreaterThanOrEqual(2);
  });
});
