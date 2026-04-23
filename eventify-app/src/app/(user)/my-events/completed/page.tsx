import { MyEventsSubList } from "../_components/my-events-sub-list"

export default function MyEventsCompletedPage() {
    return (
        <MyEventsSubList
            variant="completed"
            title="All completed events"
            emptyMessage="You have no completed events yet."
        />
    )
}
