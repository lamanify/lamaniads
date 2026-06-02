'use client';

import React from 'react';
import { useParams } from 'next/navigation';

export default function VPage() {
  const params = useParams();
  const id = params?.id;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">V Page</h1>
      <p className="mt-4">ID: {id}</p>
    </div>
  );
}
