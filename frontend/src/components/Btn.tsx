import './Btn.css';

export const Btn = ({ txt, type, disable = false, callback }: { txt: string; type: 'DELETE' | 'CREATE' | 'COPY'; disable?: boolean; callback: () => void }) => {
    const getColor = () => {
        switch (type) {
            case 'DELETE':
                return '#ff4747';
            case 'CREATE':
                return '#005fb8';
            default:
                return '#6f7173';
        }
    };
    return (
        <div className={`btn-wrap${disable ? '-none-hover' : ''}`}>
            <button disabled={disable} onClick={callback} style={{ backgroundColor: disable ? 'rgb(115 115 115)' : getColor() }}>
                <span>{txt}</span>
            </button>
        </div>
    );
};
