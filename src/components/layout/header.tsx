'use client';

import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const Header = () => {
  const logo = PlaceHolderImages.find(p => p.id === 'aviva-logo');

  return (
    <header className={cn("p-4 flex justify-between items-center")}>
      <Link href="/" className="flex items-center gap-3 w-fit">
        {logo && (
          <Image
            src={logo.imageUrl}
            alt={logo.description}
            data-ai-hint={logo.imageHint}
            width={120}
            height={40}
            className="object-contain"
          />
        )}
      </Link>
      
      <Button asChild variant="default">
        <Link href="/admin">
          <ShieldCheck />
          Admin
        </Link>
      </Button>
    </header>
  );
};

export default Header;
