import React from "react";

const LowQuantityStock = () => {
  return (
    <>
      <section className="space-y-1">
        <div className="flex items-center justify-between bg-white shadow-xl rounded-xl p-2">
          <div className="text-xs">
            <p>Chemistry Analyzer</p>
          </div>
          <div className="text-xs text-primary">
            <p>120 Ltrs</p>
          </div>
        </div>
        <div className="flex items-center justify-between bg-white shadow-xl rounded-xl p-2">
          <div className="text-xs">
            <p>Reagent 2</p>
          </div>
          <div className="text-xs text-warning">
            <p>10 Ltrs</p>
          </div>
        </div>
      </section>
    </>
  );
};

export default LowQuantityStock;
