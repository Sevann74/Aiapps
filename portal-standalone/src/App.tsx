import AICourseBuilderPortal from './AICourseBuilderPortal';
import StagingBanner from './components/StagingBanner';

function App() {
  const isStaging = import.meta.env.VITE_APP_ENV === 'staging';
  
  return (
    <>
      <StagingBanner />
      <div className={isStaging ? 'pt-10' : ''}>
        <AICourseBuilderPortal />
      </div>
    </>
  );
}

export default App;
