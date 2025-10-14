export default function GameBoard({
  board,
  onSelectCell,
  isDisabled,
  winningLine,
  lastMove
}) {
  const renderCell = (value, index) => {
    const isWinningCell = winningLine?.includes(index);
    const isLastMove = lastMove === index;
    return (
      <button
        key={index}
        type="button"
        onClick={() => onSelectCell(index)}
        disabled={isDisabled || Boolean(value)}
        className={[
          "flex h-24 w-24 items-center justify-center rounded-lg border border-slate-700 text-4xl font-bold transition",
          "md:h-28 md:w-28 md:text-5xl",
          value === "X" ? "text-emerald-400" : "",
          value === "O" ? "text-sky-400" : "",
          isWinningCell ? "bg-slate-800 border-emerald-400 shadow-lg shadow-emerald-500/20" : "",
          isLastMove && !isWinningCell ? "border-slate-500 bg-slate-900" : "",
          !value && !isDisabled ? "hover:border-emerald-400 hover:bg-slate-900" : "",
          isDisabled && !value ? "cursor-not-allowed opacity-60" : ""
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {board.map((value, index) => renderCell(value, index))}
    </div>
  );
}
