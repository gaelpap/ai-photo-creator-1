'use client';

import Link from 'next/link';

export default function PurchaseSuccess() {
  return (
    <div className="container mx-auto p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">Purchase Successful!</h1>
      <p className="mb-4">You have successfully purchased 3 Lora credits.</p>
      <Link href="/lora-training" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
        Return to Lora Training
      </Link>
    </div>
  );
}
