import Select, { type Props as SelectProps, type GroupBase } from 'react-select'

// Themed react-select for dark mode
const darkThemeStyles = {
    control: (base: any, state: any) => ({
        ...base,
        backgroundColor: 'var(--bg-secondary)',
        borderColor: state.isFocused ? 'var(--accent)' : 'var(--border)',
        boxShadow: state.isFocused ? '0 0 0 3px var(--accent-light)' : 'none',
        borderRadius: '8px',
        minHeight: '42px',
        cursor: 'pointer',
        '&:hover': {
            borderColor: state.isFocused ? 'var(--accent)' : 'var(--border-light)',
        },
    }),
    menu: (base: any) => ({
        ...base,
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 9999,
    }),
    menuList: (base: any) => ({
        ...base,
        padding: '4px',
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected
            ? 'var(--accent)'
            : state.isFocused
                ? 'var(--bg-hover)'
                : 'transparent',
        color: state.isSelected ? '#fff' : 'var(--text-primary)',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        padding: '8px 12px',
        '&:active': {
            backgroundColor: 'var(--accent-hover)',
        },
    }),
    singleValue: (base: any) => ({
        ...base,
        color: 'var(--text-primary)',
        fontSize: '14px',
    }),
    placeholder: (base: any) => ({
        ...base,
        color: 'var(--text-muted)',
        fontSize: '14px',
    }),
    input: (base: any) => ({
        ...base,
        color: 'var(--text-primary)',
        fontSize: '14px',
    }),
    indicatorSeparator: (base: any) => ({
        ...base,
        backgroundColor: 'var(--border)',
    }),
    dropdownIndicator: (base: any) => ({
        ...base,
        color: 'var(--text-muted)',
        '&:hover': { color: 'var(--text-secondary)' },
    }),
    clearIndicator: (base: any) => ({
        ...base,
        color: 'var(--text-muted)',
        '&:hover': { color: 'var(--danger)' },
    }),
    multiValue: (base: any) => ({
        ...base,
        backgroundColor: 'var(--accent-light)',
        borderRadius: '4px',
    }),
    multiValueLabel: (base: any) => ({
        ...base,
        color: 'var(--accent)',
        fontSize: '13px',
    }),
    multiValueRemove: (base: any) => ({
        ...base,
        color: 'var(--accent)',
        '&:hover': {
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger)',
        },
    }),
    noOptionsMessage: (base: any) => ({
        ...base,
        color: 'var(--text-muted)',
        fontSize: '14px',
    }),
    loadingMessage: (base: any) => ({
        ...base,
        color: 'var(--text-muted)',
        fontSize: '14px',
    }),
}

export interface RSelectOption {
    value: string | number
    label: string
}

type RSelectProps<
    Option = RSelectOption,
    IsMulti extends boolean = false,
    Group extends GroupBase<Option> = GroupBase<Option>
> = SelectProps<Option, IsMulti, Group> & {
    isInvalid?: boolean
}

export default function RSelect<
    Option = RSelectOption,
    IsMulti extends boolean = false,
    Group extends GroupBase<Option> = GroupBase<Option>
>({ isInvalid, styles: customStyles, ...props }: RSelectProps<Option, IsMulti, Group>) {
    const mergedStyles: any = {
        ...darkThemeStyles,
        control: (base: any, state: any) => ({
            ...darkThemeStyles.control(base, state),
            borderColor: isInvalid
                ? 'var(--danger)'
                : state.isFocused
                    ? 'var(--accent)'
                    : 'var(--border)',
            boxShadow: isInvalid
                ? '0 0 0 3px var(--danger-light)'
                : state.isFocused
                    ? '0 0 0 3px var(--accent-light)'
                    : 'none',
            ...customStyles?.control?.(base, state),
        }),
        ...customStyles,
    }

    return (
        <Select<Option, IsMulti, Group>
            styles={mergedStyles}
            classNamePrefix="rselect"
            {...props}
        />
    )
}
