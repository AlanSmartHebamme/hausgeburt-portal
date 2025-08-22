"use client";

import Image from "next/image";
import Link from "next/link";

const midwives = [
  {
    photo: "/hebamme-1.jpg",
    name: "Anna Müller",
    city: "Berlin",
    distance: "5 km",
    qualifications: ["Geburtsvorbereitung", "Wochenbettbetreuung", "Stillberatung"],
  },
  {
    photo: "/hebamme-2.jpg",
    name: "Maria Schmidt",
    city: "Hamburg",
    distance: "12 km",
    qualifications: ["Hausgeburt", "Akupunktur", "Wochenbettbetreuung"],
  },
  {
    photo: "/hebamme-3.jpg",
    name: "Sofia Weber",
    city: "München",
    distance: "8 km",
    qualifications: ["Yoga für Schwangere", "Stillberatung", "Beikost"],
  },
  {
    photo: "/hebamme-4.jpg",
    name: "Lena Meier",
    city: "Köln",
    distance: "2 km",
    qualifications: ["Geburtsvorbereitung", "Hausgeburt"],
  },
  {
    photo: "/hebamme-5.jpg",
    name: "Julia Becker",
    city: "Frankfurt",
    distance: "15 km",
    qualifications: ["Wochenbettbetreuung", "Rückbildungsgymnastik"],
  },
  {
    photo: "/hebamme-6.jpg",
    name: "Laura Schulz",
    city: "Stuttgart",
    distance: "7 km",
    qualifications: ["Stillberatung", "Trageberatung", "Babymassage"],
  },
];

export function MidwifeGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {midwives.map((midwife) => (
        <div key={midwife.name} className="border rounded-lg overflow-hidden shadow hover:shadow-lg flex flex-col">
          <div className="relative h-48 w-full">
            <Image
              src={`https://via.placeholder.com/400x300.png/ddd/333?text=Foto+von+${encodeURIComponent(midwife.name)}`}
              alt={`Foto von ${midwife.name}`}
              layout="fill"
              objectFit="cover"
            />
          </div>
          <div className="p-4 flex-grow">
            <h3 className="text-xl font-bold">{midwife.name}</h3>
            <p className="text-sm text-slate-600">{midwife.city} • {midwife.distance}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {midwife.qualifications.map((q) => (
                <span key={q} className="text-xs bg-slate-200 rounded-full px-2 py-1">{q}</span>
              ))}
            </div>
          </div>
          <div className="p-4 border-t mt-auto">
            <button className="w-full bg-blue-600 text-white rounded-md py-2">Anfragen</button>
          </div>
        </div>
      ))}
    </div>
  );
}
