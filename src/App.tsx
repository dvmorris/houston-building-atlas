export default function App() {
  return (
    <div className="flex h-screen w-screen flex-col bg-stone-900 text-stone-100">
      <header className="flex h-14 items-center justify-between border-b border-stone-800 px-4">
        <h1 className="text-lg font-bold tracking-wide">
          Preservation Houston Building Atlas
        </h1>
      </header>
      <main className="relative flex-1">
        <div className="flex h-full items-center justify-center text-stone-400">
          Map container initialized
        </div>
      </main>
    </div>
  );
}
