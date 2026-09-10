export interface EvaluationItem {
  id: number;
  label: string;
  labelEn: string;
  category: string;
  isStaffOnly?: boolean;
}

export interface EvaluationCategory {
  code: string;
  title: string;
  titleEn: string;
  isStaffOnly?: boolean;
  items: EvaluationItem[];
}

export const EVALUATION_CATEGORIES: EvaluationCategory[] = [
  {
    code: 'A',
    title: 'A. PRESTASI KERJA',
    titleEn: 'A. WORK PERFORMANCE',
    items: [
      { id: 1, label: 'Kualitas Hasil Kerja', labelEn: 'Quality of Work Output', category: 'A' },
      { id: 2, label: 'Keterampilan / Kemampuan', labelEn: 'Job Skills / Capability', category: 'A' },
      { id: 3, label: 'Efisiensi dan Efektifitas', labelEn: 'Efficiency & Effectiveness', category: 'A' },
    ],
  },
  {
    code: 'B',
    title: 'B. TANGGUNG JAWAB',
    titleEn: 'B. RESPONSIBILITY',
    items: [
      { id: 4, label: 'Terhadap tugas', labelEn: 'Towards assigned duties', category: 'B' },
      { id: 5, label: 'Terhadap keberlangsungan perusahaan', labelEn: 'Towards company sustainability', category: 'B' },
      { id: 6, label: 'Berani mengambil resiko', labelEn: 'Willingness to take calculated risks', category: 'B' },
    ],
  },
  {
    code: 'C',
    title: 'C. KETAATAN',
    titleEn: 'C. COMPLIANCE & DISCIPLINE',
    items: [
      { id: 7, label: 'Menaati ketentuan jam kerja', labelEn: 'Adherence to working hours', category: 'C' },
      { id: 8, label: 'Disiplin', labelEn: 'Work discipline', category: 'C' },
      { id: 9, label: 'Menaati ketentuan Perusahaan', labelEn: 'Adherence to company policies', category: 'C' },
    ],
  },
  {
    code: 'D',
    title: 'D. DEDIKASI',
    titleEn: 'D. DEDICATION',
    items: [
      { id: 10, label: 'Menggunakan wewenang jabatan dengan tanggungjawab', labelEn: 'Exercising job authority responsibly', category: 'D' },
      { id: 11, label: 'Memberikan hasil sesuai rencana kerja', labelEn: 'Delivering results in line with work plans', category: 'D' },
      { id: 12, label: 'Ikhlas melaksanakan pekerjaan', labelEn: 'Dedication & commitment to work', category: 'D' },
    ],
  },
  {
    code: 'E',
    title: 'E. KERJASAMA',
    titleEn: 'E. TEAMWORK & COLLABORATION',
    items: [
      { id: 13, label: 'Memahami hubungan kerja dengan departemen lain', labelEn: 'Understanding inter-department coordination', category: 'E' },
      { id: 14, label: 'Mampu bekerjasama dengan rekan kerja', labelEn: 'Able to work collaboratively with colleagues', category: 'E' },
      { id: 15, label: 'Mampu menerima keputusan yang telah diambil', labelEn: 'Accepting organizational decisions', category: 'E' },
    ],
  },
  {
    code: 'F',
    title: 'F. KOMPETENSI KERJA',
    titleEn: 'F. WORK COMPETENCY',
    items: [
      { id: 16, label: 'Inisiatif', labelEn: 'Initiative', category: 'F' },
      { id: 17, label: 'Inovatif', labelEn: 'Innovation', category: 'F' },
      { id: 18, label: 'Aktif dalam memberikan saran yang konstruktif', labelEn: 'Active in providing constructive feedback', category: 'F' },
    ],
  },
  {
    code: 'G',
    title: 'G. KEPEMIMPINAN',
    titleEn: 'G. LEADERSHIP',
    items: [
      { id: 19, label: 'Mampu mengambil keputusan', labelEn: 'Sound decision-making ability', category: 'G' },
      { id: 20, label: 'Tegas dan objektif', labelEn: 'Firm and objective leadership', category: 'G' },
      { id: 21, label: 'Mampu menentukan prioritas kerja', labelEn: 'Able to set work priorities', category: 'G' },
      { id: 22, label: 'Mampu melakukan koordinasi dengan baik', labelEn: 'Effective coordination capability', category: 'G' },
    ],
  },
  {
    code: 'H',
    title: 'H. KEPEMIMPINAN (KHUSUS STAFF)',
    titleEn: 'H. LEADERSHIP (STAFF LEVEL)',
    isStaffOnly: true,
    items: [
      { id: 23, label: 'Mampu mengontrol kualitas bawahan', labelEn: 'Able to supervise subordinates\' work quality', category: 'H', isStaffOnly: true },
      { id: 24, label: 'Mampu menjadi panutan bagi bawahan', labelEn: 'Serving as a role model for subordinates', category: 'H', isStaffOnly: true },
      { id: 25, label: 'Memahami kemampuan bawahan', labelEn: 'Understanding subordinates\' capabilities', category: 'H', isStaffOnly: true },
      { id: 26, label: 'Mampu memberikan motivasi dan pembinaan', labelEn: 'Providing motivation and coaching', category: 'H', isStaffOnly: true },
    ],
  },
  {
    code: 'I',
    title: 'I. MORAL',
    titleEn: 'I. INTEGRITY & CONDUCT',
    items: [
      { id: 27, label: 'Kejujuran', labelEn: 'Honesty & Integrity', category: 'I' },
      { id: 28, label: 'Kesopanan', labelEn: 'Professional Courtesy & Politeness', category: 'I' },
      { id: 29, label: 'Kesusilaan', labelEn: 'Moral Ethics & Decency', category: 'I' },
    ],
  },
];

export const EVALUATOR_STATEMENTS = [
  {
    id: 1,
    text: 'Saya sudah berusaha secara maksimal untuk memberikan petunjuk dan pembinaan',
    textEn: 'I have made maximum effort to provide guidance and mentoring',
  },
  {
    id: 2,
    text: 'Saya sudah berusaha melatih semaksimal mungkin agar Ybs mampu melakukan hal yang diharapkan',
    textEn: 'I have trained the employee to the best of my ability to meet expected job performance',
  },
  {
    id: 3,
    text: 'Saya sudah berusaha untuk menghindari kemunduran performansi bawahan saya',
    textEn: 'I have made every effort to prevent any decline in my subordinate\'s performance',
  },
];

export function getLocalizedGrade(grade: string | null | undefined, lang: 'id' | 'en' = 'id') {
  if (!grade) return '-';
  if (lang === 'en') {
    switch (grade.toUpperCase()) {
      case 'MEMUASKAN':
        return 'SATISFACTORY';
      case 'CUKUP MEMUASKAN':
        return 'FAIRLY SATISFACTORY';
      case 'KURANG MEMUASKAN':
        return 'LESS SATISFACTORY';
      case 'TIDAK MEMUASKAN':
        return 'UNSATISFACTORY';
      default:
        return grade;
    }
  }
  return grade;
}

export function computeEvaluation(scores: Record<number, number>, isStaff: boolean) {
  let total = 0;
  let count = 0;

  for (const cat of EVALUATION_CATEGORIES) {
    if (cat.isStaffOnly && !isStaff) continue;
    for (const item of cat.items) {
      if (item.isStaffOnly && !isStaff) continue;
      const val = scores[item.id];
      if (typeof val === 'number' && val > 0) {
        total += val;
        count++;
      }
    }
  }

  if (count === 0) {
    return {
      total: 0,
      count: 0,
      average: 0,
      grade: '-',
      recommendationType: '-',
      recommendationDuration: null,
    };
  }

  const average = Math.round((total / count) * 100) / 100;

  let grade = 'MEMUASKAN';
  let recommendationType = 'LANJUT_KONTRAK';
  let recommendationDuration: number | null = 12;

  if (average >= 3.0) {
    grade = 'MEMUASKAN';
    recommendationType = 'LANJUT_KONTRAK';
    recommendationDuration = 12;
  } else if (average >= 2.76) {
    grade = 'CUKUP MEMUASKAN';
    recommendationType = 'LANJUT_KONTRAK';
    recommendationDuration = 6;
  } else if (average >= 2.0) {
    grade = 'KURANG MEMUASKAN';
    recommendationType = 'LANJUT_KONTRAK';
    recommendationDuration = 3;
  } else {
    grade = 'TIDAK MEMUASKAN';
    recommendationType = 'SELESAI_KONTRAK';
    recommendationDuration = null;
  }

  return {
    total,
    count,
    average,
    grade,
    recommendationType,
    recommendationDuration,
  };
}
