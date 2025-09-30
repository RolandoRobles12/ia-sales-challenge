import Header from "@/components/layout/header";
import PracticeContainer from "@/components/practice/practice-container";

export default function PracticePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <PracticeContainer />
      </main>
    </div>
  );
}
