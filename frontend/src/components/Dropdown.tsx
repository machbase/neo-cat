import { useState } from 'react';
import './Dropdown.css';

export const Dropdown = ({
    txt,
    initVal,
    list = [],
    disable = false,
    callback = () => {},
}: {
    txt: string;
    initVal: string;
    list?: { key: string; value: string }[];
    disable?: boolean;
    callback?: (item: { key: string; value: string }) => void;
}) => {
    const [sIsOpen, setIsOpen] = useState<boolean>(false);

    const handleCallback = (aItem: { key: string; value: string }) => {
        callback(aItem);
        setIsOpen(false);
    };

    return (
        <div className='drop-down-wrap'>
            <span className='drop-down-title'>{txt}</span>
            <div className='drop-down-header' onClick={() => setIsOpen(!sIsOpen)}>
                <span>{initVal ?? ''}</span>
            </div>
            {sIsOpen && !disable && (
                <div className='drop-down-body'>
                    {list.map((pItem, aIdx: number) => {
                        return (
                            <div key={pItem.key + aIdx + ''} className={'drop-down-body-item'} onClick={() => handleCallback(pItem)}>
                                <span>{pItem.key}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
