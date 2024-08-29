import './Inp.css';

export const Inp = ({
    label,
    initVal,
    disable = false,
    callback = () => {},
}: {
    label: string;
    initVal: string;
    disable?: boolean;
    callback?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
    return (
        <div className='inp-wrap'>
            <label htmlFor={`inp-wrap-${label}`}>{label}</label>
            <input readOnly={disable} id={`inp-wrap-${label}`} value={initVal} onChange={callback} />
        </div>
    );
};
