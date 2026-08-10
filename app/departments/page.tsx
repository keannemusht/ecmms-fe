'use client';

import React from 'react';
import { Building2, Plus } from 'lucide-react';
import ReferenceData from '../components/ReferenceData';

export default function DepartmentsPage() {
  return <ReferenceData endpoint="/departments" dict="departments" icon={Building2} addIcon={Plus} />;
}
