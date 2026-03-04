-- Allow users to delete their own registrations if status is 'carrinho'
CREATE POLICY "Users can delete their own cart items"
ON event_registrations FOR DELETE
USING (
    registered_by = auth.uid() AND status = 'carrinho'
);
