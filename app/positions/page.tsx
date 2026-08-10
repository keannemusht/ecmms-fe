'use client';

import React from 'react';
import { BriefcaseBusiness, Plus } from 'lucide-react';
import ReferenceData from '../components/ReferenceData';

export default function PositionsPage() {
  return <ReferenceData endpoint="/positions" dict="positions" icon={BriefcaseBusiness} addIcon={Plus} />;
}
