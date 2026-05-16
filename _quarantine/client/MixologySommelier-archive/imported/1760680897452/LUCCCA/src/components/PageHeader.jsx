import React from 'react';
import { SectionTitle } from './SectionTitle';
import { Divider } from './Divider';

export function PageHeader({ title }) {
  return (
    <div className="page-header mb-6">
      <SectionTitle title={title} />
      <Divider />
    </div>
  );
}
