export const tileClasses = (v: number) => {
  const base = 'tile rounded-2xl font-extrabold grid place-items-center transition-transform duration-150 select-none';

  const bg =
    v === 0
      ? 'bg-neutral-300/40 dark:bg-neutral-600/40'
      : v === 2
      ? 'bg-[#eee4da]'
      : v === 4
      ? 'bg-[#ede0c8]'
      : v === 8
      ? 'bg-[#f2b179]'
      : v === 16
      ? 'bg-[#f59563]'
      : v === 32
      ? 'bg-[#f67c5f]'
      : v === 64
      ? 'bg-[#f65e3b]'
      : v === 128
      ? 'bg-[#edcf72]'
      : v === 256
      ? 'bg-[#edcc61]'
      : v === 512
      ? 'bg-[#edc850]'
      : v === 1024
      ? 'bg-[#edc53f]'
      : 'bg-[#edc22e]';

  return `${base} ${bg}`;
};

export const digitColorClass = (v: number) => {
  if (v === 2 || v === 4) {
    return 'text-gray-700 dark:text-gray-800';
  }
  return 'text-white';
};
