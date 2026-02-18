"use client"

import { useState } from "react"
import {
    PaymentElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Loader2, ShieldCheck, CreditCard } from "lucide-react"

interface CheckoutFormProps {
    amount: number
    onSuccess: (paymentIntent: any) => void
}

const CheckoutForm = ({ amount, onSuccess }: CheckoutFormProps) => {
    const stripe = useStripe()
    const elements = useElements()
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()

        if (!stripe || !elements) return

        setLoading(true)
        setErrorMessage(null)

        const result = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/dashboard/payments`,
            },
            redirect: "if_required",
        })

        if (result.error) {
            setErrorMessage(result.error.message || "An unexpected error occurred.")
            setLoading(false)
        } else if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
            onSuccess(result.paymentIntent)
        } else {
            // Processing or redirected
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                <div className="flex justify-between items-center text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">
                    <span>Stripe Secure Payment</span>
                    <CreditCard className="h-4 w-4" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                    ${amount.toLocaleString()}
                </div>
            </div>

            <PaymentElement className="stripe-element-container" />

            {errorMessage && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100">
                    {errorMessage}
                </div>
            )}

            <Button
                type="submit"
                disabled={!stripe || loading}
                className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200"
            >
                {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <ShieldCheck className="mr-2 h-5 w-5 text-emerald-400" />
                )}
                {loading ? "Processing..." : "Authorize Secure Payment"}
            </Button>

            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                Your payment is encrypted and secured by Stripe. <br />
                By proceeding, you agree to our financial terms.
            </p>
        </form>
    )
}

interface StripeCheckoutModalProps {
    isOpen: boolean
    onClose: () => void
    clientSecret: string
    amount: number
    onSuccess: (paymentIntent: any) => void
}

import { loadStripe } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

export const StripeCheckoutModal = ({
    isOpen,
    onClose,
    clientSecret,
    amount,
    onSuccess,
}: StripeCheckoutModalProps) => {
    if (!clientSecret) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md rounded-[40px] border-none shadow-2xl p-8 bg-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
                        Checkout Portal
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium">
                        Finalize your project funding securely via our global payment infrastructure.
                    </DialogDescription>
                </DialogHeader>

                <Elements
                    stripe={stripePromise}
                    options={{
                        clientSecret,
                        appearance: {
                            theme: 'stripe',
                            variables: {
                                colorPrimary: '#0f172a',
                                borderRadius: '16px',
                            },
                        },
                    }}
                >
                    <CheckoutForm amount={amount} onSuccess={onSuccess} />
                </Elements>
            </DialogContent>
        </Dialog>
    )
}
