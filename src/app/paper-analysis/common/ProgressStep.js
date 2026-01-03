const ProgressStep = ({ step, currentStep, title }) => {
    const isActive = currentStep === step;
    const isCompleted = currentStep > step;
  
    return (
      <div className="flex items-center gap-2">
        <div className={`rounded-full w-8 h-8 flex items-center justify-center ${
          isCompleted ? 'bg-[#e86161]' : 
          isActive ? 'bg-[#80869b]' : 
          'bg-[#e9ebf2]'
        }`}>
          <span className="text-white">{step + 1}</span>
        </div>
        <span className={`text-sm ${
          isActive ? 'text-[#e86161]' : 
          isCompleted ? 'text-[#80869b]' : 
          'text-[#5b6176]'
        }`}>
          {title}
        </span>
      </div>
    );
  };