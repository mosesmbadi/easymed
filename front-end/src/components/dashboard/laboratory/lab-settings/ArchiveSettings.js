import React, { useState } from 'react';
import Positions from '../sample-archive/Positions';
import Sections from '../sample-archive/Sections';
import Component from '../sample-archive/Component';
import Archive from '../sample-archive/Archive';
import Racks from '../sample-archive/Racks';

const ArchiveSettings = () => {
    const [currentTab, setCurrentTab] = useState(0);

    return (
        <section className="mt-4">
            <div className="w-full py-1 px-2 flex items-center gap-4 text-center">
                <div>
                    <p
                        className={`${currentTab === 0
                            ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                            : "cursor-pointer text-center p-4"
                            } `}
                        onClick={() => setCurrentTab(0)}
                    >
                        Archive
                    </p>
                </div>

                <div>
                    <p
                        className={`${currentTab === 1
                            ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                            : "cursor-pointer text-center p-4"
                            } `}
                        onClick={() => setCurrentTab(1)}
                    >
                        Compartment
                    </p>
                </div>

                <div>
                    <p
                        className={`${currentTab === 2
                            ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                            : "cursor-pointer text-center p-4"
                            } `}
                        onClick={() => setCurrentTab(2)}
                    >
                        Sections
                    </p>
                </div>

                <div>
                    <p
                        className={`${currentTab === 3
                            ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                            : "cursor-pointer text-center p-4"
                            } `}
                        onClick={() => setCurrentTab(3)}
                    >
                        Racks
                    </p>
                </div>

                <div>
                    <p
                        className={`${currentTab === 4
                            ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                            : "cursor-pointer text-center p-4"
                            }`}
                        onClick={() => setCurrentTab(4)}
                    >
                        Positions
                    </p>
                </div>
            </div>

            <div className="mt-2">
                {currentTab === 0 && <Archive />}
                {currentTab === 1 && <Component />}
                {currentTab === 2 && <Sections />}
                {currentTab === 3 && <Racks />}
                {currentTab === 4 && <Positions />}
            </div>
        </section>
    );
};

export default ArchiveSettings;
