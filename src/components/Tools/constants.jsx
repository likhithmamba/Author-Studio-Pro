import React from 'react';
import { HiOutlineDocumentText, HiOutlineBeaker, HiOutlineEnvelope, HiOutlineChartBar } from 'react-icons/hi2';

export const TABS = [
    { id: 'format', icon: <HiOutlineDocumentText />, label: 'Format', badge: 'No AI needed' },
    { id: 'analyse', icon: <HiOutlineBeaker />, label: 'Analyse', badge: 'AI optional' },
    { id: 'query', icon: <HiOutlineEnvelope />, label: 'Query', badge: 'Manual mode' },
    { id: 'market', icon: <HiOutlineChartBar />, label: 'Market', badge: 'No AI needed' },
];

export const TEMPLATES = [
    { value: 'us_standard', label: 'US Standard (Curtis Brown)' },
    { value: 'uk_standard', label: 'UK Standard (AAR/PA)' },
    { value: 'literary', label: 'Literary / Academic' },
    { value: 'screenplay', label: 'Screenplay (WGA)' },
    { value: 'self_pub', label: 'Self-Publishing (KDP)' },
];

export const GENRES = [
    { value: 'thriller', label: 'Thriller' },
    { value: 'mystery', label: 'Mystery / Crime' },
    { value: 'romance', label: 'Romance' },
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'science_fiction', label: 'Science Fiction' },
    { value: 'literary', label: 'Literary Fiction' },
    { value: 'horror', label: 'Horror' },
    { value: 'historical', label: 'Historical Fiction' },
    { value: 'ya_contemp', label: 'YA Contemporary' },
    { value: 'ya_fantasy', label: 'YA Fantasy' },
    { value: 'cozy_mystery', label: 'Cozy Mystery' },
    { value: 'womens_fiction', label: "Women's Fiction" },
];
