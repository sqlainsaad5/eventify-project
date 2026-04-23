import { MyEventsSubList } from "../_components/my-events-sub-list"

export default function MyEventsActivePage() {
    return (
        <MyEventsSubList
            variant="active"
            title="All active events"
            emptyMessage="You have no active events right now."
        />
    )
}
