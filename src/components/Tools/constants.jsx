import React from 'react';
import { HiOutlineDocumentText, HiOutlineBeaker, HiOutlineEnvelope, HiOutlineChartBar } from 'react-icons/hi2';

export const TABS = [
    { id: 'format', icon: <HiOutlineDocumentText />, label: 'Format', badge: 'No AI needed' },
    { id: 'analyse', icon: <HiOutlineBeaker />, label: 'Analyse', badge: 'AI optional' },
    { id: 'query', icon: <HiOutlineEnvelope />, label: 'Query', badge: 'Manual mode' },
    { id: 'market', icon: <HiOutlineChartBar />, label: 'Market', badge: 'No AI needed' },
];

export const TEMPLATES = [
    { value: 'traditional', label: 'Traditional Manuscript (US/UK)' },
    { value: 'modern', label: 'Modern Literary (Trade)' },
    { value: 'kdp', label: 'Self-Publishing (KDP)' },
    { value: 'academic', label: 'Academic / University Press' },
    { value: 'a4', label: 'International A4' },
];

export const GENRES = [
    { value: 'thriller', label: 'Thriller / Suspense' },
    { value: 'literary_fiction', label: 'Literary Fiction' },
    { value: 'romance', label: 'Romance' },
    { value: 'fantasy', label: 'Fantasy (Adult)' },
    { value: 'sci_fi', label: 'Science Fiction (Adult)' },
    { value: 'mystery', label: 'Mystery / Crime Fiction' },
    { value: 'historical_fiction', label: 'Historical Fiction' },
    { value: 'horror', label: 'Horror' },
    { value: 'ya_fantasy', label: 'YA Fantasy' },
    { value: 'ya_contemporary', label: 'YA Contemporary' },
    { value: 'middle_grade', label: 'Middle Grade (8-12)' },
    { value: 'narrative_nonfiction', label: 'Narrative Non-Fiction' },
    { value: 'memoir', label: 'Memoir' },
];
