import './Inp.css';

export const Inp = ({ label, initVal, callback }: { label: string; initVal: string; callback: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
    return (
        <div className='inp-wrap'>
            <label htmlFor={`inp-wrap-${label}`}>{label}</label>
            <input id={`inp-wrap-${label}`} value={initVal} onChange={callback} />
        </div>
    );
};
