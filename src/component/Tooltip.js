/**
 * @fileOverview Tooltip
 */
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {translateStyle} from 'react-smooth';
import _ from 'lodash';
import classNames from 'classnames';
import DefaultTooltipContent from './DefaultTooltipContent';
import {isSsr} from '../util/ReactUtils';
import {isNumber} from '../util/DataUtils';
import pureRender from '../util/PureRender';

const CLS_PREFIX = 'recharts-tooltip-wrapper';

const EPS = 1;

const propTypes = {
    content: PropTypes.oneOfType([PropTypes.element, PropTypes.func]),
    viewBox: PropTypes.shape({
        x: PropTypes.number,
        y: PropTypes.number,
        width: PropTypes.number,
        height: PropTypes.number,
    }),

    active: PropTypes.bool,
    separator: PropTypes.string,
    formatter: PropTypes.func,
    offsetX: PropTypes.number,
    offsetY: PropTypes.number,

    itemStyle: PropTypes.object,
    labelStyle: PropTypes.object,
    wrapperStyle: PropTypes.object,
    contentStyle: PropTypes.object,
    cursor: PropTypes.oneOfType([PropTypes.bool, PropTypes.element, PropTypes.object]),

    coordinate: PropTypes.shape({
        x: PropTypes.number,
        y: PropTypes.number,
    }),
    position: PropTypes.shape({
        x: PropTypes.number,
        y: PropTypes.number,
    }),

    label: PropTypes.any,
    payload: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.any,
        value: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.array]),
        unit: PropTypes.any,
    })),

    isAnimationActive: PropTypes.bool,
    animationDuration: PropTypes.number,
    animationEasing: PropTypes.oneOf([
        'ease',
        'ease-in',
        'ease-out',
        'ease-in-out',
        'linear',
    ]),
    itemSorter: PropTypes.func,
    filterNull: PropTypes.bool,
    useTranslate3d: PropTypes.bool,
};

const defaultProps = {
    active: false,
    offsetX: 10,
    offsetY: 10,
    viewBox: {x1: 0, x2: 0, y1: 0, y2: 0},
    coordinate: {x: 0, y: 0},
    cursorStyle: {},
    separator: ' : ',
    wrapperStyle: {},
    contentStyle: {},
    itemStyle: {},
    labelStyle: {},
    cursor: true,
    isAnimationActive: !isSsr(),
    animationEasing: 'ease',
    animationDuration: 400,
    itemSorter: () => -1,
    filterNull: true,
    useTranslate3d: false,
};

const renderContent = (content, props) => {
    if (React.isValidElement(content)) {
        return React.cloneElement(content, props);
    }
    if (_.isFunction(content)) {
        return content(props);
    }

    return React.createElement(DefaultTooltipContent, props);
};

@pureRender
class Tooltip extends Component {
    static displayName = 'Tooltip';

    static propTypes = propTypes;

    static defaultProps = defaultProps;

    state = {
        boxWidth: -1,
        boxHeight: -1,
    };

    componentDidMount() {
        this.updateBBox();
    }

    componentDidUpdate() {
        this.updateBBox();
    }

    updateBBox() {
        const {boxWidth, boxHeight} = this.state;

        if (this.wrapperNode && this.wrapperNode.getBoundingClientRect) {
            const box = this.wrapperNode.getBoundingClientRect();

            if (Math.abs(box.width - boxWidth) > EPS || Math.abs(box.height - boxHeight) > EPS) {
                this.setState({
                    boxWidth: box.width,
                    boxHeight: box.height,
                });
            }
        } else if (boxWidth !== -1 || boxHeight !== -1) {
            this.setState({
                boxWidth: -1,
                boxHeight: -1,
            });
        }
    }

    render() {
        const {
            payload, isAnimationActive, animationDuration, animationEasing,
            filterNull
        } = this.props;
        const finalPayload = filterNull && payload && payload.length ?
            payload.filter(entry => !_.isNil(entry.value)) : payload;
        const hasPayload = finalPayload && finalPayload.length;
        const {content, viewBox, coordinate, position, active, offsetX, offsetY, wrapperStyle} = this.props;
        let outerStyle = {
            pointerEvents: 'none',
            visibility: active && hasPayload ? 'visible' : 'hidden',
            position: 'absolute',
            top: 0,
            ...wrapperStyle,
        };
        let translateX, translateY;

        if (position && isNumber(position.x) && isNumber(position.y)) {
            translateX = position.x;
            translateY = position.y;
        } else {
            const {boxWidth, boxHeight} = this.state;

            if (boxWidth > 0 && boxHeight > 0 && coordinate) {
                translateX = coordinate.x - boxWidth - offsetX;
                translateY =coordinate.y + offsetY;
            } else {
                outerStyle.visibility = 'hidden';
            }
        }

        outerStyle = {
            ...outerStyle,
            ...translateStyle({
                transform: this.props.useTranslate3d ? `translate3d(${translateX}px, ${translateY}px, 0)` : `translate(${translateX}px, ${translateY}px)`,
            }),
        };

        if (isAnimationActive && active) {
            outerStyle = {
                ...outerStyle,
                ...translateStyle({
                    transition: `transform ${animationDuration}ms ${animationEasing}`,
                }),
            };
        }

        const cls = classNames(CLS_PREFIX, {
            [`${CLS_PREFIX}-right`]: isNumber(translateX) && coordinate && isNumber(coordinate.x) && translateX >= coordinate.x,
            [`${CLS_PREFIX}-left`]: isNumber(translateX) && coordinate && isNumber(coordinate.x) && translateX < coordinate.x,
            [`${CLS_PREFIX}-bottom`]: isNumber(translateY) && coordinate && isNumber(coordinate.y) && translateY >= coordinate.y,
            [`${CLS_PREFIX}-top`]: isNumber(translateY) && coordinate && isNumber(coordinate.y) && translateY < coordinate.y,
        });

        return (
            <div
                className={cls}
                style={outerStyle}
                ref={(node) => {
                    this.wrapperNode = node;
                }}
            >
                {renderContent(content, {...this.props, payload: finalPayload})}
            </div>
        );
    }
}

export default Tooltip;
