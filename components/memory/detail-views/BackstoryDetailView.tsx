'use client';

import GenericDetailView from './GenericDetailView';
import { DetailViewProps } from './types';

export default function View(props: DetailViewProps) {
  return <GenericDetailView {...props} />;
}
