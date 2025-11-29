import React, { useState, useEffect } from 'react';
import { Text, TextStyle } from 'react-native';

interface TypewriterTextProps {
    text: string;
    style?: TextStyle;
    speed?: number;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({ text, style, speed = 30 }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        let i = 0;
        setDisplayedText('');

        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayedText((prev) => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed]);

    return <Text style={style}>{displayedText}</Text>;
};
